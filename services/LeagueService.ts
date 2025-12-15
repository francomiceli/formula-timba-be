import { Op, fn, col, literal } from "sequelize";
import {
  League,
  LeagueMember,
  User,
  Prediction,
  Race,
  sequelize,
} from "../models/index.js";
import crypto from "crypto";

class LeagueService {
  // ==========================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ==========================================

  /**
   * Genera un código de invitación único de 8 caracteres
   * @returns {string} Código en mayúsculas
   */
  _generateInviteCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Genera un slug único basado en el nombre
   * @param {string} name - Nombre de la liga
   * @returns {Promise<string>} Slug único
   */
  async _generateUniqueSlug(name) {
    let baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = baseSlug;
    let counter = 1;

    // Verificar unicidad incluyendo soft-deleted
    while (await League.findOne({ where: { slug }, paranoid: false })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Calcula el ranking de un usuario en una liga
   * @param {Array} members - Lista de miembros con totalPoints
   * @param {number} userId - ID del usuario
   * @returns {number} Posición en el ranking (1-indexed)
   */
  _calculateUserRank(members, userId) {
    const sorted = [...members].sort((a, b) => {
      // Primero por puntos (descendente)
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      // Empate: por fecha de unión (más antiguo primero)
      return new Date(a.joinedAt) - new Date(b.joinedAt);
    });

    const index = sorted.findIndex((m) => m.userId === userId);
    return index === -1 ? 0 : index + 1;
  }

  // ==========================================
  // CRUD DE LIGAS
  // ==========================================

  /**
   * Crea una nueva liga
   * @param {Object} data - Datos de la liga
   * @param {string} data.name - Nombre de la liga (3-100 chars)
   * @param {string} [data.description] - Descripción opcional
   * @param {boolean} [data.isPublic=true] - Si es pública
   * @param {number} [data.maxMembers] - Máximo de miembros
   * @param {string} [data.imageUrl] - URL de imagen/logo
   * @param {number} creatorId - ID del usuario creador
   * @returns {Promise<Object>} Liga creada con info del creador
   */
  async createLeague(data, creatorId) {
    const transaction = await sequelize.transaction();

    try {
      // Validar nombre
      if (!data.name || data.name.trim().length < 3) {
        throw new Error('El nombre debe tener al menos 3 caracteres');
      }

      const slug = await this._generateUniqueSlug(data.name.trim());
      const inviteCode = data.isPublic === false ? this._generateInviteCode() : null;

      // Crear la liga
      const league = await League.create({
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        isPublic: data.isPublic ?? true,
        inviteCode,
        createdBy: creatorId,
        season: data.season || new Date().getFullYear(),
        maxMembers: data.maxMembers || null,
        imageUrl: data.imageUrl || null,
        status: 'active',
      }, { transaction });

      // Agregar al creador como admin
      await LeagueMember.create({
        leagueId: league.id,
        userId: creatorId,
        role: 'admin',
        totalPoints: 0,
        status: 'active',
        joinedAt: new Date(),
      }, { transaction });

      await transaction.commit();

      return {
        id: league.id,
        name: league.name,
        slug: league.slug,
        description: league.description,
        isPublic: league.isPublic,
        inviteCode: league.inviteCode,
        season: league.season,
        maxMembers: league.maxMembers,
        imageUrl: league.imageUrl,
        memberCount: 1,
        userRank: 1,
        userPoints: 0,
        isAdmin: true,
        createdAt: league.createdAt,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Obtiene una liga por ID con información completa
   * @param {number} leagueId - ID de la liga
   * @param {number} [userId] - ID del usuario para info personalizada
   * @returns {Promise<Object|null>} Liga con detalles
   */
  async getLeagueById(leagueId, userId = null) {
    const league = await League.findByPk(leagueId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
        },
        {
          model: LeagueMember,
          as: 'leagueMemberships',
          where: { status: 'active' },
          required: false,
          attributes: ['userId', 'totalPoints', 'role', 'joinedAt'],
        },
      ],
    });

    if (!league || league.status === 'deleted') {
      return null;
    }

    const members = league.leagueMemberships || [];
    const memberCount = members.length;

    let userMembership = null;
    let userRank = 0;

    if (userId) {
      userMembership = members.find((m) => m.userId === userId);
      if (userMembership) {
        userRank = this._calculateUserRank(members, userId);
      }
    }

    return {
      id: league.id,
      name: league.name,
      slug: league.slug,
      description: league.description,
      isPublic: league.isPublic,
      inviteCode: userMembership?.role === 'admin' ? league.inviteCode : null,
      season: league.season,
      maxMembers: league.maxMembers,
      imageUrl: league.imageUrl,
      status: league.status,
      creator: {
        id: league.creator.id,
        username: league.creator.username,
      },
      memberCount,
      // Info del usuario actual (si está en la liga)
      isMember: !!userMembership,
      isAdmin: userMembership?.role === 'admin',
      isModerator: userMembership?.role === 'moderator',
      userRank,
      userPoints: userMembership?.totalPoints || 0,
      userRole: userMembership?.role || null,
      createdAt: league.createdAt,
    };
  }

  /**
   * Obtiene una liga por slug
   * @param {string} slug - Slug de la liga
   * @param {number} [userId] - ID del usuario
   * @returns {Promise<Object|null>} Liga con detalles
   */
  async getLeagueBySlug(slug, userId = null) {
    const league = await League.findOne({
      where: { slug, status: 'active' },
    });

    if (!league) {
      return null;
    }

    return this.getLeagueById(league.id, userId);
  }

  /**
   * Actualiza una liga (solo admin)
   * @param {number} leagueId - ID de la liga
   * @param {Object} data - Datos a actualizar
   * @param {number} userId - ID del usuario que actualiza
   * @returns {Promise<Object>} Liga actualizada
   */
  async updateLeague(leagueId, data, userId) {
    // Verificar que es admin
    const membership = await LeagueMember.findOne({
      where: { leagueId, userId, role: 'admin', status: 'active' },
    });

    if (!membership) {
      throw new Error('No tienes permisos para editar esta liga');
    }

    const league = await League.findByPk(leagueId);
    if (!league) {
      throw new Error('Liga no encontrada');
    }

    // Campos actualizables
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.isPublic !== undefined) {
      updateData.isPublic = data.isPublic;
      // Generar código si pasa a privada
      if (!data.isPublic && !league.inviteCode) {
        updateData.inviteCode = this._generateInviteCode();
      }
    }
    if (data.maxMembers !== undefined) updateData.maxMembers = data.maxMembers;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

    await league.update(updateData);

    return this.getLeagueById(leagueId, userId);
  }

  /**
   * Regenera el código de invitación (solo admin)
   * @param {number} leagueId - ID de la liga
   * @param {number} userId - ID del usuario
   * @returns {Promise<string>} Nuevo código
   */
  async regenerateInviteCode(leagueId, userId) {
    const membership = await LeagueMember.findOne({
      where: { leagueId, userId, role: 'admin', status: 'active' },
    });

    if (!membership) {
      throw new Error('No tienes permisos para esta acción');
    }

    const newCode = this._generateInviteCode();
    await League.update({ inviteCode: newCode }, { where: { id: leagueId } });

    return newCode;
  }

  // ==========================================
  // MEMBRESÍAS
  // ==========================================

  /**
   * Obtiene las ligas de un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} [options] - Opciones de filtrado
   * @param {string} [options.status='active'] - Estado de membresía
   * @param {number} [options.season] - Filtrar por temporada
   * @returns {Promise<Array>} Lista de ligas del usuario
   */
  async getUserLeagues(userId, options = {}) {
    const { status = 'active', season } = options;

    const whereClause = { status };
    if (season) {
      whereClause['$league.season$'] = season;
    }

    const memberships = await LeagueMember.findAll({
      where: { userId, ...whereClause },
      include: [
        {
          model: League,
          as: 'league',
          where: { status: 'active' },
          include: [
            {
              model: LeagueMember,
              as: 'leagueMemberships',
              where: { status: 'active' },
              required: false,
              attributes: ['userId', 'totalPoints', 'joinedAt'],
            },
          ],
        },
      ],
      order: [[{ model: League, as: 'league' }, 'name', 'ASC']],
    });

    return memberships.map((membership) => {
      const league = membership.league;
      const allMembers = league.leagueMemberships || [];
      const userRank = this._calculateUserRank(allMembers, userId);

      return {
        id: league.id,
        name: league.name,
        slug: league.slug,
        description: league.description,
        imageUrl: league.imageUrl,
        season: league.season,
        memberCount: allMembers.length,
        userRank,
        userPoints: membership.totalPoints,
        isAdmin: membership.role === 'admin',
        isModerator: membership.role === 'moderator',
        role: membership.role,
        joinedAt: membership.joinedAt,
      };
    });
  }

  /**
   * Une a un usuario a una liga por código de invitación
   * @param {number} userId - ID del usuario
   * @param {string} inviteCode - Código de invitación
   * @returns {Promise<Object>} Información de la membresía
   */
  async joinLeagueByCode(userId, inviteCode) {
    const league = await League.findOne({
      where: { 
        inviteCode: inviteCode.toUpperCase(),
        status: 'active',
      },
      include: [{
        model: LeagueMember,
        as: 'leagueMemberships',
        where: { status: 'active' },
        required: false,
      }],
    });

    if (!league) {
      throw new Error('Código de invitación inválido o liga no encontrada');
    }

    // Verificar si ya es miembro
    const existingMember = await LeagueMember.findOne({
      where: { leagueId: league.id, userId },
    });

    if (existingMember) {
      if (existingMember.status === 'active') {
        throw new Error('Ya eres miembro de esta liga');
      }
      if (existingMember.status === 'banned') {
        throw new Error('Has sido baneado de esta liga');
      }
      // Si estaba inactivo, reactivar
      await existingMember.update({ status: 'active', joinedAt: new Date() });
      return {
        leagueId: league.id,
        leagueName: league.name,
        leagueSlug: league.slug,
        role: existingMember.role,
        message: 'Te has reincorporado a la liga',
      };
    }

    // Verificar límite de miembros
    const currentMembers = league.leagueMemberships?.length || 0;
    if (league.maxMembers && currentMembers >= league.maxMembers) {
      throw new Error('La liga ha alcanzado el máximo de miembros');
    }

    // Crear membresía
    const membership = await LeagueMember.create({
      leagueId: league.id,
      userId,
      role: 'member',
      totalPoints: 0,
      status: 'active',
      joinedAt: new Date(),
    });

    return {
      leagueId: league.id,
      leagueName: league.name,
      leagueSlug: league.slug,
      role: membership.role,
      message: 'Te has unido a la liga exitosamente',
    };
  }

  /**
   * Une a un usuario a una liga pública
   * @param {number} userId - ID del usuario
   * @param {number} leagueId - ID de la liga
   * @returns {Promise<Object>} Información de la membresía
   */
  async joinPublicLeague(userId, leagueId) {
    const league = await League.findByPk(leagueId, {
      include: [{
        model: LeagueMember,
        as: 'leagueMemberships',
        where: { status: 'active' },
        required: false,
      }],
    });

    if (!league || league.status !== 'active') {
      throw new Error('Liga no encontrada');
    }

    if (!league.isPublic) {
      throw new Error('Esta liga es privada. Necesitas un código de invitación');
    }

    // Verificar membresía existente
    const existingMember = await LeagueMember.findOne({
      where: { leagueId, userId },
    });

    if (existingMember) {
      if (existingMember.status === 'active') {
        throw new Error('Ya eres miembro de esta liga');
      }
      if (existingMember.status === 'banned') {
        throw new Error('Has sido baneado de esta liga');
      }
      await existingMember.update({ status: 'active', joinedAt: new Date() });
      return {
        leagueId: league.id,
        leagueName: league.name,
        leagueSlug: league.slug,
        role: existingMember.role,
      };
    }

    // Verificar límite de miembros
    const currentMembers = league.leagueMemberships?.length || 0;
    if (league.maxMembers && currentMembers >= league.maxMembers) {
      throw new Error('La liga ha alcanzado el máximo de miembros');
    }

    const membership = await LeagueMember.create({
      leagueId,
      userId,
      role: 'member',
      totalPoints: 0,
      status: 'active',
      joinedAt: new Date(),
    });

    return {
      leagueId: league.id,
      leagueName: league.name,
      leagueSlug: league.slug,
      role: membership.role,
    };
  }

  /**
   * Sale de una liga (no puede salir el último admin)
   * @param {number} userId - ID del usuario
   * @param {number} leagueId - ID de la liga
   * @returns {Promise<Object>} Resultado
   */
  async leaveLeague(userId, leagueId) {
    const membership = await LeagueMember.findOne({
      where: { leagueId, userId, status: 'active' },
    });

    if (!membership) {
      throw new Error('No eres miembro de esta liga');
    }

    // Si es admin, verificar que no sea el único
    if (membership.role === 'admin') {
      const adminCount = await LeagueMember.count({
        where: { leagueId, role: 'admin', status: 'active' },
      });

      if (adminCount <= 1) {
        throw new Error('No puedes salir siendo el único administrador. Transfiere el rol primero.');
      }
    }

    await membership.update({ status: 'inactive' });

    return {
      success: true,
      message: 'Has salido de la liga',
    };
  }

  // ==========================================
  // RANKING Y ESTADÍSTICAS
  // ==========================================

  /**
   * Obtiene el ranking completo de una liga
   * @param {number} leagueId - ID de la liga
   * @param {Object} [options] - Opciones
   * @param {number} [options.limit] - Límite de resultados
   * @param {number} [options.offset] - Offset para paginación
   * @returns {Promise<Object>} Ranking con metadata
   */
  async getLeagueRanking(leagueId, options = {}) {
    const { limit, offset = 0 } = options;

    const league = await League.findByPk(leagueId);
    if (!league || league.status !== 'active') {
      throw new Error('Liga no encontrada');
    }

    const queryOptions = {
      where: { leagueId, status: 'active' },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username'],
        },
      ],
      order: [
        ['totalPoints', 'DESC'],
        ['correctPositions', 'DESC'],
        ['joinedAt', 'ASC'],
      ],
      offset,
    };

    if (limit) {
      queryOptions.limit = limit;
    }

    const { count, rows: members } = await LeagueMember.findAndCountAll(queryOptions);

    const ranking = members.map((member, index) => ({
      rank: offset + index + 1,
      userId: member.userId,
      username: member.user.username,
      totalPoints: member.totalPoints,
      predictionsCount: member.predictionsCount,
      correctPositions: member.correctPositions,
      currentStreak: member.currentStreak,
      bestStreak: member.bestStreak,
      role: member.role,
      joinedAt: member.joinedAt,
    }));

    return {
      leagueId,
      leagueName: league.name,
      totalMembers: count,
      ranking,
      pagination: {
        total: count,
        limit: limit || count,
        offset,
        hasMore: limit ? offset + limit < count : false,
      },
    };
  }

  /**
   * Obtiene estadísticas de una liga
   * @param {number} leagueId - ID de la liga
   * @returns {Promise<Object>} Estadísticas
   */
  async getLeagueStats(leagueId) {
    const league = await League.findByPk(leagueId, {
      include: [{
        model: LeagueMember,
        as: 'leagueMemberships',
        where: { status: 'active' },
        required: false,
      }],
    });

    if (!league) {
      throw new Error('Liga no encontrada');
    }

    const members = league.leagueMemberships || [];
    
    // Calcular estadísticas agregadas
    const totalPoints = members.reduce((sum, m) => sum + m.totalPoints, 0);
    const totalPredictions = members.reduce((sum, m) => sum + m.predictionsCount, 0);
    const totalCorrect = members.reduce((sum, m) => sum + m.correctPositions, 0);

    // Top performer
    const topMember = members.length > 0 
      ? members.reduce((top, m) => m.totalPoints > top.totalPoints ? m : top, members[0])
      : null;

    // Mejor racha en la liga
    const bestStreak = members.length > 0
      ? Math.max(...members.map(m => m.bestStreak))
      : 0;

    return {
      leagueId,
      leagueName: league.name,
      memberCount: members.length,
      totalPoints,
      totalPredictions,
      totalCorrectPositions: totalCorrect,
      avgPointsPerMember: members.length > 0 ? Math.round(totalPoints / members.length) : 0,
      bestStreak,
      topPerformer: topMember ? {
        rank: 1,
        points: topMember.totalPoints,
      } : null,
      season: league.season,
    };
  }

  // ==========================================
  // BÚSQUEDA Y LISTADO
  // ==========================================

  /**
   * Busca ligas públicas
   * @param {Object} options - Opciones de búsqueda
   * @param {string} [options.search] - Término de búsqueda
   * @param {number} [options.season] - Temporada
   * @param {number} [options.limit=20] - Límite
   * @param {number} [options.offset=0] - Offset
   * @returns {Promise<Object>} Ligas encontradas
   */
  async searchPublicLeagues(options = {}) {
    const { search, season, limit = 20, offset = 0 } = options;

    const whereClause = {
      isPublic: true,
      status: 'active',
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    if (season) {
      whereClause.season = season;
    }

    const { count, rows: leagues } = await League.findAndCountAll({
      where: whereClause,
      include: [{
        model: LeagueMember,
        as: 'leagueMemberships',
        where: { status: 'active' },
        required: false,
        attributes: ['id'],
      }],
      order: [
        [literal('(SELECT COUNT(*) FROM league_members WHERE league_members.leagueId = League.id AND league_members.status = "active")'), 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
      offset,
      distinct: true,
    });

    return {
      leagues: leagues.map((league) => ({
        id: league.id,
        name: league.name,
        slug: league.slug,
        description: league.description,
        imageUrl: league.imageUrl,
        season: league.season,
        memberCount: league.leagueMemberships?.length || 0,
        maxMembers: league.maxMembers,
        isFull: league.maxMembers ? (league.leagueMemberships?.length || 0) >= league.maxMembers : false,
        createdAt: league.createdAt,
      })),
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    };
  }

  // ==========================================
  // ADMINISTRACIÓN DE MIEMBROS
  // ==========================================

  /**
   * Cambia el rol de un miembro (solo admin)
   * @param {number} leagueId - ID de la liga
   * @param {number} targetUserId - ID del usuario a modificar
   * @param {string} newRole - Nuevo rol ('admin', 'moderator', 'member')
   * @param {number} requesterId - ID del usuario que hace la solicitud
   * @returns {Promise<Object>} Resultado
   */
  async changeMemberRole(leagueId, targetUserId, newRole, requesterId) {
    // Verificar que el solicitante es admin
    const requesterMembership = await LeagueMember.findOne({
      where: { leagueId, userId: requesterId, role: 'admin', status: 'active' },
    });

    if (!requesterMembership) {
      throw new Error('No tienes permisos para cambiar roles');
    }

    // No puede cambiarse a sí mismo
    if (targetUserId === requesterId) {
      throw new Error('No puedes cambiar tu propio rol');
    }

    const targetMembership = await LeagueMember.findOne({
      where: { leagueId, userId: targetUserId, status: 'active' },
    });

    if (!targetMembership) {
      throw new Error('El usuario no es miembro de esta liga');
    }

    // Validar rol
    if (!['admin', 'moderator', 'member'].includes(newRole)) {
      throw new Error('Rol inválido');
    }

    // Si se quita admin, verificar que no sea el único
    if (targetMembership.role === 'admin' && newRole !== 'admin') {
      const adminCount = await LeagueMember.count({
        where: { leagueId, role: 'admin', status: 'active' },
      });

      if (adminCount <= 1) {
        throw new Error('Debe haber al menos un administrador en la liga');
      }
    }

    await targetMembership.update({ role: newRole });

    return {
      success: true,
      userId: targetUserId,
      newRole,
      message: `Rol cambiado a ${newRole}`,
    };
  }

  /**
   * Banea a un miembro de la liga (solo admin/moderator)
   * @param {number} leagueId - ID de la liga
   * @param {number} targetUserId - ID del usuario a banear
   * @param {number} requesterId - ID del usuario que hace la solicitud
   * @returns {Promise<Object>} Resultado
   */
  async banMember(leagueId, targetUserId, requesterId) {
    const requesterMembership = await LeagueMember.findOne({
      where: { 
        leagueId, 
        userId: requesterId, 
        role: { [Op.in]: ['admin', 'moderator'] },
        status: 'active',
      },
    });

    if (!requesterMembership) {
      throw new Error('No tienes permisos para banear miembros');
    }

    if (targetUserId === requesterId) {
      throw new Error('No puedes banearte a ti mismo');
    }

    const targetMembership = await LeagueMember.findOne({
      where: { leagueId, userId: targetUserId, status: 'active' },
    });

    if (!targetMembership) {
      throw new Error('El usuario no es miembro de esta liga');
    }

    // Moderadores no pueden banear admins
    if (requesterMembership.role === 'moderator' && targetMembership.role === 'admin') {
      throw new Error('No puedes banear a un administrador');
    }

    // Admins no pueden banear a otros admins
    if (targetMembership.role === 'admin') {
      throw new Error('No se puede banear a un administrador');
    }

    await targetMembership.update({ status: 'banned' });

    return {
      success: true,
      userId: targetUserId,
      message: 'Usuario baneado de la liga',
    };
  }
}

export default new LeagueService();