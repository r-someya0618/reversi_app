import { GameGateway } from '../dataaccess/gameGateway'
import { TurnGateway } from '../dataaccess/turnGateway'
import { SquareGateway } from '../dataaccess/squareGateway'
import { MoveGateway } from '../dataaccess/moveGateway'
import { connectMySQl } from '../dataaccess/connection'
import { DARK, LIGHT } from '../application/constants'

const gameGateway = new GameGateway()
const turnGateway = new TurnGateway()
const moveGateway = new MoveGateway()
const squareGateway = new SquareGateway()

class FindLatestGameTurnByTurnCountOutPut {
  constructor(
    private _turnCount: number,
    private _board: number[][],
    private _nextDisc: number | undefined,
    private _winnerDisc: number | undefined
  ) {}

  get turnCount() {
    return this._turnCount
  }

  get board() {
    return this._board
  }

  get nextDisc() {
    return this._nextDisc
  }

  get winnerDisc() {
    return this._winnerDisc
  }
}

// turnに関する処理
export class TurnService {
  async findLatestGameTurnByTurnCount(
    turnCount: number
  ): Promise<FindLatestGameTurnByTurnCountOutPut> {
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

      return new FindLatestGameTurnByTurnCountOutPut(
        turnCount,
        board,
        turnRecord.nextDisc,
        // TODO: 決着がついた場合にgame_resultsテーブルから取得
        undefined
      )
    } finally {
      await conn.end()
    }
  }

  async registerTurn(turnCount: number, disc: number, x: number, y: number) {
    const conn = await connectMySQl()
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
  }
}
