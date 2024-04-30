import { connectMySQl } from '../../infrastructure/connection'
import { ApplicationError } from '../error/applicationError'
import { GameResult } from '../../domain/model/gameResult/gameResult'
import { GameRepository } from '../../domain/model/game/gameRepository'
import { TurnRepository } from '../../domain/model/turn/turnRepository'
import { GameResultRepository } from '../../domain/model/gameResult/gameResultRepository'

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
export class FindLatestGameTurnByTurnCountUseCase {
  constructor(
    private _gameRepository: GameRepository,
    private _gameResultRepository: GameResultRepository,
    private _turnRepository: TurnRepository
  ) {}

  async run(turnCount: number): Promise<FindLatestGameTurnByTurnCountOutPut> {
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
      // game idと turn_countで絞り込みターンの情報を取得する
      const turn = await this._turnRepository.findForGameIdAndTurnCount(
        conn,
        game.id,
        turnCount
      )

      let gameResult: GameResult | undefined
      if (turn.gameEnded()) {
        gameResult = await this._gameResultRepository.findForGameId(conn, game.id)
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
}
