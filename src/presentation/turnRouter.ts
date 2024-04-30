import express from 'express'
import { Point } from '../domain/model/turn/point'
import { toDisc } from '../domain/model/turn/disc'
import { GameMySQLRepository } from '../infrastructure/repository/game/gameMySQLRepository'
import { GameResultMySQLRepository } from '../infrastructure/repository/gameResult/gameResultMySQLRepository'
import { TurnMySQLRepository } from '../infrastructure/repository/turn/turnMySQLRepository'
import { FindLatestGameTurnByTurnCountUseCase } from '../application/useCase/findLatestGameTurnByTurnCountUseCase'
import { RegisterTurnUseCase } from '../application/useCase/registerTurnUseCase'

export const turnRouter = express.Router()

const registerTurnUseCase = new RegisterTurnUseCase(
  new GameMySQLRepository(),
  new GameResultMySQLRepository(),
  new TurnMySQLRepository()
)

const findLatestGameTurnByTurnCountUseCase =
  new FindLatestGameTurnByTurnCountUseCase(
    new GameMySQLRepository(),
    new GameResultMySQLRepository(),
    new TurnMySQLRepository()
  )

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
    const output = await findLatestGameTurnByTurnCountUseCase.run(turnCount)

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
    const disc = toDisc(req.body.move.disc)
    const point = new Point(req.body.move.x, req.body.move.y)

    await registerTurnUseCase.run(turnCount, disc, point)

    res.status(201).end()
  }
)
