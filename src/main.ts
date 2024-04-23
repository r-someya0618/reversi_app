import express from 'express'
import morgan from 'morgan'
import 'express-async-errors'
import mysql from 'mysql2/promise'

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

    const gameInsertResult = await conn.execute<mysql.ResultSetHeader>(
      'insert into games (started_at) values (?)',
      [now]
    )
    const gameId = gameInsertResult[0].insertId

    const turnInsertResult = await conn.execute<mysql.ResultSetHeader>(
      'insert into turns (game_id, turn_count, next_disc, end_at) values (?, ?, ?, ?)',
      [gameId, 0, DARK, now]
    )

    const turnId = turnInsertResult[0].insertId

    // 盤面の数をカウントする
    const squareCount = INITIAL_BOARD.map((line) => line.length).reduce(
      (v1, v2) => v1 + v2,
      0
    )

    // 盤面を登録するSQL文
    // 'insert into squares (turn_id, x, y, disc) values (?, ?, ?, ?), (?, ?, ?, ?) ...64個になる... (?, ?, ?, ?),
    const squareInsertSql =
      'insert into squares (turn_id, x, y, disc) values ' +
      Array.from(Array(squareCount))
        .map(() => '(?, ?, ?, ?)')
        .join(', ')

    const squaresInsertValues: any[] = []
    INITIAL_BOARD.forEach((line, y) => {
      // 一次元目の配列の要素数のカウント => 縦方向の数 = y
      /**
       * [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY], → line、y = 0
       * ~省略~
       * [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY], → line、y = 7
       */
      line.forEach((disc, x) => {
        // 二次元目の配列の要素数のカウント → 横方向の数 = x
        // [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY] → disc = 0 (EMPTYで定義)、x = ０から7
        squaresInsertValues.push(turnId)
        squaresInsertValues.push(x)
        squaresInsertValues.push(y)
        squaresInsertValues.push(disc)
      })
    })
    await conn.execute(squareInsertSql, squaresInsertValues)

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
    const gameSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, started_at from games order by id desc limit 1'
    )
    const game = gameSelectResult[0][0]

    // game idと turn_countで絞り込みターンの情報を取得する
    const turnSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, game_id, turn_count, next_disc, end_at from turns where game_id = ? and turn_count = ?',
      [game['id'], turnCount]
    )
    const turn = turnSelectResult[0][0]

    // turnの情報から盤面情報を取得
    const squaresSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, turn_id, x, y, disc from squares where turn_id = ?',
      [turn['id']]
    )
    const squares = squaresSelectResult[0]

    // 8x8の２次元配列を作成
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
    // 盤面の石の情報をboard配列に入れる
    squares.forEach((s) => {
      board[s.y][s.x] = s.disc
    })

    const responseBody = {
      turnCount,
      board,
      nextDisc: turn['next_disc'],
      // TODO: 決着がついた場合にgame_resultsテーブルから取得
      winnerDisc: null,
    }

    res.json(responseBody)
  } finally {
    await conn.end()
  }
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
