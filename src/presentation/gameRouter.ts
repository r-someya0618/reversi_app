import express from 'express'
import { StartNewGameUseCase } from '../application/useCase/startNewGameUseCase'
import { TurnMySQLRepository } from '../infrastructure/repository/turn/turnMySQLRepository'
import { GameMySQLRepository } from '../infrastructure/repository/game/gameMySQLRepository'

export const gameRouter = express.Router()

const startNewGameUseCase = new StartNewGameUseCase(
  new GameMySQLRepository(),
  new TurnMySQLRepository()
)

// Gameに関するエンドポイントを整理
// リクエストとレスポンスに関する処理のみ
gameRouter.post('/api/games', async (req, res) => {
  await startNewGameUseCase.run()

  res.status(201).end()
})
