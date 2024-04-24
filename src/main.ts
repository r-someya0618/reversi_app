import express from 'express'
import morgan from 'morgan'
import 'express-async-errors'
import mysql from 'mysql2/promise'
import { GameGateway } from './dataaccess/gameGateway'
import { TurnGateway } from './dataaccess/turnGateway'
import { MoveGateway } from './dataaccess/moveGateway'
import { SquareGateway } from './dataaccess/squareGateway'

const EMPTY = 0
const DARK = 1
const LIGHT = 2

const INITIAL_BOARD = [
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, DARK, LIGHT, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, LIGHT, DARK, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
]

const PORT = 3000

const app = express()

app.use(morgan('dev'))
app.use(express.static('static', { extensions: ['html'] }))
app.use(express.json())

const gameGateway = new GameGateway()
const turnGateway = new TurnGateway()
const moveGateway = new MoveGateway()
const squareGateway = new SquareGateway()

app.get('/api/hello', async (req, res) => {
  res.json({
    message: 'Hello Express!!!',
  })
})

app.get('/api/error', async (req, res) => {
  throw new Error('Error Endpoint')
})

app.post('/api/games', async (req, res) => {
  const now = new Date()
  const conn = await connectMySQl()

  try {
    await conn.beginTransaction()
    // 新規ゲームの登録
    const gameRecord = await gameGateway.insert(conn, now)
    // 初期盤面の登録
    const turnRecord = await turnGateway.insert(conn, gameRecord.id, 0, DARK, now)
    await squareGateway.insertAll(conn, turnRecord.id, INITIAL_BOARD)

    await conn.commit()
  } finally {
    await conn.end()
  }

  res.status(201).end()
})

app.get('/api/games/latest/turns/:turnCount', async (req, res) => {
  const turnCount = parseInt(req.params.turnCount)

  const conn = await connectMySQl()
  try {
    // 最新のgameテーブルの対戦情報を取得
    const gameRecord = await gameGateway.findLatest(conn)
    // 対戦情報が完全に未登録の場合
    if (!gameRecord) {
      throw new Error('Latest game not found')
    }
    // game idと turn_countで絞り込みターンの情報を取得する
    const turnRecord = await turnGateway.findForGameIdAndTurnCount(
      conn,
      gameRecord.id,
      turnCount
    )
    if (!turnRecord) {
      throw new Error('Specified turn not found')
    }

    // turnの情報から盤面情報を取得
    const squareRecords = await squareGateway.findForTurnId(conn, turnRecord.id)

    // 8x8の２次元配列を作成
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
    // 盤面の石の情報をboard配列に入れる
    squareRecords.forEach((s) => {
      board[s.y][s.x] = s.disc
    })

    const responseBody = {
      turnCount,
      board,
      nextDisc: turnRecord.nextDisc,
      // TODO: 決着がついた場合にgame_resultsテーブルから取得
      winnerDisc: null,
    }

    res.json(responseBody)
  } finally {
    await conn.end()
  }
})

app.post('/api/games/latest/turns', async (req, res) => {
  const conn = await connectMySQl()

  // ターン数と置く石の情報をリクエストから取得
  const turnCount = parseInt(req.body.turnCount)
  const disc = parseInt(req.body.move.disc)
  const x = parseInt(req.body.move.x)
  const y = parseInt(req.body.move.y)

  try {
    // 最新のgameテーブルの対戦情報を取得
    const gameRecord = await gameGateway.findLatest(conn)
    // 対戦情報が完全に未登録の場合
    if (!gameRecord) {
      throw new Error('Latest game not found')
    }

    // 一つ前のターン数を設定
    const previousTurnCount = turnCount - 1
    //  一つ前のターンのデータを取得
    const previousTurnRecord = await turnGateway.findForGameIdAndTurnCount(
      conn,
      gameRecord.id,
      previousTurnCount
    )
    if (!previousTurnRecord) {
      throw new Error('Specified turn not found')
    }

    // turnの情報から一つ前の盤面情報を取得
    const squareRecords = await squareGateway.findForTurnId(
      conn,
      previousTurnRecord.id
    )

    // 8x8の２次元配列を作成
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
    // 盤面の石の情報をboard配列に入れる
    squareRecords.forEach((s) => {
      board[s.y][s.x] = s.disc
    })

    // 盤面におけるかチェック

    // 石を置く
    board[y][x] = disc

    // ひっくり返す

    // ターンを保存する
    const nextDisc = disc === DARK ? LIGHT : DARK
    const now = new Date()
    const turnRecord = await turnGateway.insert(
      conn,
      gameRecord.id,
      turnCount,
      nextDisc,
      now
    )
    // 盤面の保存
    await squareGateway.insertAll(conn, turnRecord.id, board)
    // 手の保存
    await moveGateway.insert(conn, turnRecord.id, disc, x, y)

    await conn.commit()
  } finally {
    await conn.end()
  }

  res.status(201).end()
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Reversi application started: http://localhost:${PORT}`)
})

function errorHandler(
  err: any,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) {
  console.error('Unexpected error occurred', err)
  res.status(500).send({
    message: 'Unexpected error occurred',
  })
}

async function connectMySQl() {
  return await mysql.createConnection({
    host: 'localhost',
    database: 'reversi',
    user: 'reversi',
    password: 'password',
  })
}
