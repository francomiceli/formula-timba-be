import { seedPilots } from "./pilots.seed.js";
import { seedRaces } from "./races.seed.js";

/**
 * Ejecuta todos los seeds de la aplicación
 * Orden importante: primero entidades base, luego dependientes
 */
export async function runAllSeeds() {
  console.log("🌱 Iniciando seeds...");
  
  try {
    // 1. Pilotos (entidad base)
    await seedPilots();
    
    // 2. Carreras (entidad base)
    await seedRaces();
    
    // Aquí se pueden agregar más seeds en el futuro:
    // await seedTeams();
    // await seedSeasons();
    
    console.log("🌱 Todos los seeds completados");
  } catch (error) {
    console.error("❌ Error ejecutando seeds:", error);
    throw error;
  }
}

// Exportar seeds individuales por si se necesitan
export { seedPilots } from "./pilots.seed.js";
export { seedRaces } from "./races.seed.js";