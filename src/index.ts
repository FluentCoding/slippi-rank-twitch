import * as dotenv from 'dotenv'
dotenv.config()

import fastifyFactory from "fastify"
import { fetchLeaderboards, fetchStats } from "./client"
import { LeaderboardType, SuffixOptions } from "./types"
import { formattedCodeIfValid } from "./util"

let leaderboards: LeaderboardType
fetchLeaderboards((val: LeaderboardType) => leaderboards = val)

const fastify = fastifyFactory()
fastify.get<{
    Params: {
        code: string
    }
    Querystring: {
        hideRegion: string
        hideWinLose: string
        dontRoundRating: string
    } & SuffixOptions
}>('/rank/:code', async (request, reply) => {
    // https://slippi.gg/user/salt-747
    const { code: urlCode } = request.params
    const query = request.query

    const code = formattedCodeIfValid(urlCode)

    if (code) {
        const stats = await fetchStats(code)

        if (!stats)
            return "Couldn't fetch stats!"

        let rankRegion
        let rankPlacement

        if (leaderboards) {
            for (const region of Object.keys(leaderboards)) {
                let placement = leaderboards[region].indexOf(code);

                if (placement !== -1) {
                    rankRegion = region.toUpperCase()
                    rankPlacement = placement + 1
                    break;
                }
            }
        }

        const rankPrefix = rankPlacement ? `Rank ${rankPlacement}${query.hideRegion === undefined ? ` [${rankRegion}]` : ""}` : "No rank"
        let suffix = "";
        for (const key of (Object.keys(query) as ((keyof SuffixOptions))[])) {
            switch(key) {
                case 'profileLink':
                    suffix += ` https://slippi.gg/user/${code.replace("#", "-").toLowerCase()}`
                    break
                case 'leaderboardLink':
                    suffix += ` https://slippi.gg/leaderboards`
                    break
            }
        }
        
        return `${rankPrefix} (${stats.rating.toFixed(query.dontRoundRating === undefined ? 2 : 0)}${query.hideWinLose === undefined ? ` - ${stats.wins}W/${stats.losses}L` : ""})${suffix}`
    } else {
        return "Given code is not valid! Please check the URL of the command, the code should be formatted like abc-123 instead of ABC#123."
    }
})

const start = async () => {
try {
    await fastify.listen({ port: 3000 })
} catch (err) {
    fastify.log.error(err)
    process.exit(1)
}
}
start()