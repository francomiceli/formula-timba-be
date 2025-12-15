import Pilot from "../models/Pilot.js";

const pilotsSeed = [
  { name: "Max Verstappen", team: "Red Bull", acronym: "VER", number: "3" },
  { name: "Isack Hadjar", team: "Red Bull", acronym: "HAD", number: "6" },
  { name: "Lewis Hamilton", team: "Ferrari", acronym: "HAM", number: "44" },
  { name: "Charles Leclerc", team: "Ferrari", acronym: "LEC", number: "16" },
  { name: "Lando Norris", team: "McLaren", acronym: "NOR", number: "1" },
  { name: "Oscar Piastri", team: "McLaren", acronym: "PIA", number: "81" },
  { name: "George Russell", team: "Mercedes", acronym: "RUS", number: "63" },
  { name: "Andrea Antonelli", team: "Mercedes", acronym: "ANT", number: "12" },
  { name: "Sergio Pérez", team: "Cadillac", acronym: "PER", number: "11" },
  { name: "Valtteri Bottas", team: "Cadillac", acronym: "BOT", number: "77" },
  { name: "Fernando Alonso", team: "Aston Martin", acronym: "ALO", number: "14" },
  { name: "Lance Stroll", team: "Aston Martin", acronym: "STR", number: "18" },
  { name: "Carlos Sainz", team: "Williams", acronym: "SAI", number: "55" },
  { name: "Alexander Albon", team: "Williams", acronym: "ALB", number: "23" },
  { name: "Nico Hülkenberg", team: "Audi", acronym: "HUL", number: "27" },
  { name: "Gabriel Bortoleto", team: "Audi", acronym: "BOR", number: "5" },
  { name: "Pierre Gasly", team: "Alpine", acronym: "GAS", number: "10" },
  { name: "Franco Colapinto", team: "Alpine", acronym: "COL", number: "43" },
  { name: "Esteban Ocon", team: "Haas", acronym: "OCO", number: "31" },
  { name: "Oliver Bearman", team: "Haas", acronym: "BEA", number: "87" },
  { name: "Liam Lawson", team: "Racing Bulls", acronym: "LAW", number: "30" },
  { name: "Arvid Lindblad", team: "Racing Bulls", acronym: "LIN", number: "41" },
];

export async function seedPilots() {
  let created = 0;
  let existing = 0;

  for (const pilot of pilotsSeed) {
    const [instance, wasCreated] = await Pilot.findOrCreate({
      where: { name: pilot.name },
      defaults: pilot,
    });

    if (wasCreated) {
      created++;
    } else {
      existing++;
    }
  }

  console.log(`✅ Pilots seed: ${created} creados, ${existing} ya existían`);
}

export default pilotsSeed;