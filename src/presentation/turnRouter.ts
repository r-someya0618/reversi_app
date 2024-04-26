import express from 'express'
import { TurnService } from '../application/service/turnService'

export const turnRouter = express.Router()
const turnService = new TurnService()

interface TurnGetResponseBody {
  turnCount: number
  board: number[][]
  nextDisc: number | null
  winnerDisc: number | null
}

turnRouter.get(
  '/api/games/latest/turns/:turnCount',
  async (req, res: express.Response<TurnGetResponseBody>) => {
    const turnCount = parseInt(req.params.turnCount)
    const output = await turnService.findLatestGameTurnByTurnCount(turnCount)

    const responseBody = {
      turnCount: output.turnCount,
      board: output.board,
      nextDisc: output.nextDisc ?? null,
      winnerDisc: output.winnerDisc ?? null,
    }
    res.json(responseBody)
  }
)

interface TurnGetRequestBody {
  turnCount: number
  move: {
    disc: number
    x: number
    y: number
  }
}

turnRouter.post(
  '/api/games/latest/turns',
  async (req: express.Request<{}, {}, TurnGetRequestBody>, res) => {
    // ターン数と置く石の情報をリクエストから取得
    const turnCount = req.body.turnCount
    const disc = req.body.move.disc
    const x = req.body.move.x
    const y = req.body.move.y

    await turnService.registerTurn(turnCount, disc, x, y)

    res.status(201).end()
  }
)
