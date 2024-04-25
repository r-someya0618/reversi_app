import { connectMySQl } from '../infrastructure/connection'
import { toDisc } from '../domain/turn/disc'
import { Point } from '../domain/turn/point'
import { TurnRepository } from '../domain/turn/turnRepository'
import { GameRepository } from '../domain/game/gameRepository'

const turnRepository = new TurnRepository()
const gameRepository = new GameRepository()

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
      const game = await gameRepository.findLatest(conn)
      // 対戦情報が完全に未登録の場合
      if (!game) {
        throw new Error('Latest game not found')
      }
      if (!game.id) {
        throw new Error('game.id not exist')
      }
      // game idと turn_countで絞り込みターンの情報を取得する
      const turn = await turnRepository.findForGameIdAndTurnCount(
        conn,
        game.id,
        turnCount
      )

      return new FindLatestGameTurnByTurnCountOutPut(
        turnCount,
        turn.board.discs,
        turn.nextDisc,
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
      const game = await gameRepository.findLatest(conn)
      // 対戦情報が完全に未登録の場合
      if (!game) {
        throw new Error('Latest game not found')
      }
      if (!game.id) {
        throw new Error('game.id not exist')
      }

      // 一つ前のターン数を設定
      const previousTurnCount = turnCount - 1
      //  一つ前のターンのデータを取得
      const previousTurn = await turnRepository.findForGameIdAndTurnCount(
        conn,
        game.id,
        previousTurnCount
      )

      // 石を置く
      const newTurn = previousTurn.placeNext(toDisc(disc), new Point(x, y))

      // ターンを保存する
      await turnRepository.save(conn, newTurn)

      await conn.commit()
    } finally {
      await conn.end()
    }
  }
}
