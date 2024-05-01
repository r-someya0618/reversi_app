import express from 'express'
import { StartNewGameUseCase } from '../application/useCase/startNewGameUseCase'
import { TurnMySQLRepository } from '../infrastructure/repository/turn/turnMySQLRepository'
import { GameMySQLRepository } from '../infrastructure/repository/game/gameMySQLRepository'
import { FindLastGamesUseCase } from '../application/useCase/findLastGamesUseCase'
import { FindLastGamesMySQLQueryService } from '../infrastructure/query/findLastGamesMySQLQueryService'

export const gameRouter = express.Router()

const startNewGameUseCase = new StartNewGameUseCase(
  new GameMySQLRepository(),
  new TurnMySQLRepository()
)

const findLastGamesUseCase = new FindLastGamesUseCase(
  new FindLastGamesMySQLQueryService()
)

interface GetGameResponseBody {
  games: {
    id: number
    darkMoveCount: number
    lightMoveCount: number
    winnerDisc: number
    startedAt: Date
    endAt: Date
  }[]
}

gameRouter.get(
  '/api/games',
  async (req, res: express.Response<GetGameResponseBody>) => {
    const output = await findLastGamesUseCase.run()

    const responseBodyGames = output.map((g) => {
      return {
        id: g.gameId,
        darkMoveCount: g.darkMoveCount,
        lightMoveCount: g.lightMoveCount,
        winnerDisc: g.winnerDisc,
        startedAt: g.startedAt,
        endAt: g.endAt,
      }
    })
    const responseBody = {
      games: responseBodyGames,
    }

    res.json(responseBody)
  }
)

// Gameに関するエンドポイントを整理
// リクエストとレスポンスに関する処理のみ
gameRouter.post('/api/games', async (req, res) => {
  await startNewGameUseCase.run()
  res.status(201).end()
})
