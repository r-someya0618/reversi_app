import { connectMySQl } from '../../infrastructure/connection'
import { Disc, toDisc } from '../../domain/model/turn/disc'
import { Point } from '../../domain/model/turn/point'
import { TurnRepository } from '../../domain/model/turn/turnRepository'
import { GameRepository } from '../../domain/model/game/gameRepository'
import { GameResultRepository } from '../../domain/model/gameResult/gameResultRepository'
import { ApplicationError } from '../error/applicationError'
import { GameResult } from '../../domain/model/gameResult/gameResult'

const turnRepository = new TurnRepository()
const gameRepository = new GameRepository()
const gameResultRepository = new GameResultRepository()

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
        throw new ApplicationError('LatestGameNotFound', 'Latest game not found')
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

      let gameResult: GameResult | undefined
      if (turn.gameEnded()) {
        gameResult = await gameResultRepository.findForGameId(conn, game.id)
      }

      return new FindLatestGameTurnByTurnCountOutPut(
        turnCount,
        turn.board.discs,
        turn.nextDisc,
        gameResult?.winnerDisc
      )
    } finally {
      await conn.end()
    }
  }

  async registerTurn(turnCount: number, disc: Disc, point: Point) {
    const conn = await connectMySQl()
    try {
      // 最新のgameテーブルの対戦情報を取得
      const game = await gameRepository.findLatest(conn)
      // 対戦情報が完全に未登録の場合
      if (!game) {
        throw new ApplicationError('LatestGameNotFound', 'Latest game not found')
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
      const newTurn = previousTurn.placeNext(disc, point)

      // ターンを保存する
      await turnRepository.save(conn, newTurn)

      // 勝敗が決した場合、対戦結果を保存
      if (newTurn.gameEnded()) {
        const winnerDisc = newTurn.winnerDisc()
        const gameResult = new GameResult(game.id, winnerDisc, newTurn.endAt)
        await gameResultRepository.save(conn, gameResult)
      }

      await conn.commit()
    } finally {
      await conn.end()
    }
  }
}
