import DashboardService from "../services/DashboardService.js";

class DashboardController {
  /**
   * GET /api/dashboard
   * Obtiene todos los datos del dashboard
   */
  async getFullDashboard(req, res) {
    try {
      const userId = req.userId;
      
      const dashboardData = await DashboardService.getFullDashboard(userId);
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Error al obtener dashboard:", error);
      res.status(500).json({ 
        message: "Error al obtener datos del dashboard",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET /api/dashboard/stats
   * Obtiene solo las estadísticas del usuario
   */
  async getStats(req, res) {
    try {
      const userId = req.userId;
      
      const stats = await DashboardService.getUserStats(userId);
      
      res.json(stats);
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      res.status(500).json({ 
        message: "Error al obtener estadísticas",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET /api/dashboard/predictions
   * Obtiene las predicciones recientes del usuario
   */
  async getRecentPredictions(req, res) {
    try {
      const userId = req.userId;
      const limit = parseInt(req.query.limit) || 5;
      
      const predictions = await DashboardService.getRecentPredictions(userId, limit);
      
      res.json(predictions);
    } catch (error) {
      console.error("Error al obtener predicciones recientes:", error);
      res.status(500).json({ 
        message: "Error al obtener predicciones recientes",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET /api/dashboard/pilot-stats
   * Obtiene estadísticas de pilotos del usuario
   */
  async getPilotStats(req, res) {
    try {
      const userId = req.userId;
      
      const pilotStats = await DashboardService.getPilotStats(userId);
      
      res.json(pilotStats);
    } catch (error) {
      console.error("Error al obtener estadísticas de pilotos:", error);
      res.status(500).json({ 
        message: "Error al obtener estadísticas de pilotos",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

export default new DashboardController();