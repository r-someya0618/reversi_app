import express from 'express'
import { GameService } from '../application/service/gameService'

export const gameRouter = express.Router()

const gameService = new GameService()

// Gameに関するエンドポイントを整理
// リクエストとレスポンスに関する処理のみ
gameRouter.post('/api/games', async (req, res) => {
  await gameService.startNewGame()

  res.status(201).end()
})
