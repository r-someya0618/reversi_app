import { connectMySQl } from '../../infrastructure/connection'
import { Disc } from '../../domain/model/turn/disc'
import { Point } from '../../domain/model/turn/point'
import { ApplicationError } from '../error/applicationError'
import { GameResult } from '../../domain/model/gameResult/gameResult'
import { GameRepository } from '../../domain/model/game/gameRepository'
import { TurnRepository } from '../../domain/model/turn/turnRepository'
import { GameResultRepository } from '../../domain/model/gameResult/gameResultRepository'

export class RegisterTurnUseCase {
  constructor(
    private _gameRepository: GameRepository,
    private _gameResultRepository: GameResultRepository,
    private _turnRepository: TurnRepository
  ) {}

  async run(turnCount: number, disc: Disc, point: Point) {
    const conn = await connectMySQl()
    try {
      // 最新のgameテーブルの対戦情報を取得
      const game = await this._gameRepository.findLatest(conn)
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
      const previousTurn = await this._turnRepository.findForGameIdAndTurnCount(
        conn,
        game.id,
        previousTurnCount
      )

      // 石を置く
      const newTurn = previousTurn.placeNext(disc, point)

      // ターンを保存する
      await this._turnRepository.save(conn, newTurn)

      // 勝敗が決した場合、対戦結果を保存
      if (newTurn.gameEnded()) {
        const winnerDisc = newTurn.winnerDisc()
        const gameResult = new GameResult(game.id, winnerDisc, newTurn.endAt)
        await this._gameResultRepository.save(conn, gameResult)
      }

      await conn.commit()
    } finally {
      await conn.end()
    }
  }
}
