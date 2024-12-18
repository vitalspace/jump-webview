import { Devvit } from "@devvit/public-api";

export class LeaderboardManager {
  private ctx: Devvit.Context;

  constructor(ctx: Devvit.Context) {
    this.ctx = ctx;
  }

  /**
   * Actualiza el top N del leaderboard con el puntaje de un usuario.
   * @param leaderboardKey - La clave del leaderboard en Redis.
   * @param messageType - El tipo de mensaje que se enviará al WebView.
   * @param username - El nombre del usuario.
   * @param score - El puntaje del usuario.
   * @param topLimit - El límite del top, por defecto 5.
   */
  async updateTopN(
    leaderboardKey: string,
    messageType: string,
    username: string,
    score: number,
    topLimit: number = 5
  ): Promise<void> {
    // Obtener el puntaje actual del usuario
    const currentScore = await this.ctx.redis.zScore(leaderboardKey, username);

    // Si el usuario ya tiene un puntaje y el nuevo es menor, no actualizamos
    //@ts-ignore
    if (currentScore !== null && score <= currentScore) {
      return;
    }

    // Obtener el top actual
    const topN = await this.ctx.redis.zRange(leaderboardKey, 0, topLimit - 1);

    // Actualizar solo si el nuevo puntaje merece estar en el top
    if (topN.length < topLimit || score > (topN[topN.length - 1]?.score ?? 0)) {
      await this.ctx.redis.zAdd(leaderboardKey, {
        member: username,
        score: score,
      });
      await this.ctx.redis.zRemRangeByRank(leaderboardKey, 0, -(topLimit + 1)); // Mantener solo el top N

      // Obtener el nuevo top actualizado
      const newTopN = await this.ctx.redis.zRange(
        leaderboardKey,
        0,
        topLimit - 1
      );

      const sortedTopN = newTopN.sort((a, b) => b.score - a.score);

      // Enviar mensaje de actualización al WebView
      this.ctx.ui.webView.postMessage("myWebView", {
        type: messageType,
        data: {
          top: sortedTopN,
        },
      });
    }
  }
}
