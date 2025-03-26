/***************************************
 * Variables globales
 ***************************************/
let allPlayersStats = [];
let competitionSet = new Set();
let teamSet = new Set();

let currentSortCol = null;
let currentSortOrder = "desc";

let currentPage = 1;
const itemsPerPage = 50;

/***************************************
 * DOMContentLoaded
 ***************************************/
document.addEventListener("DOMContentLoaded", () => {
  loadAllStats();

  document.getElementById("btnApplyFilters").addEventListener("click", () => {
    currentPage = 1;
    applyFilters();
  });

  // Ordenar al hacer clic en cada <th>
  const ths = document.querySelectorAll("#statsTable thead th");
  ths.forEach(th => {
    th.addEventListener("click", () => {
      const colKey = th.dataset.col;
      if (colKey) {
        sortByColumn(colKey);
      }
    });
  });

  // Toggle Totales/Promedios
  const modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    modeToggle.addEventListener("change", () => {
      currentPage = 1;
      applyFilters();
    });
  }

  // Búsqueda en tiempo real
  const searchInput = document.getElementById("searchPlayerTeam");
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    applyFilters();
  });

  // Botones de paginación
  document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      applyFilters();
    }
  });
  document.getElementById("nextPageBtn").addEventListener("click", () => {
    currentPage++;
    applyFilters();
  });
});

/***************************************
 * 1) OBTENER LISTA DE JSON DESDE GITHUB
 ***************************************/
async function fetchMatchFiles() {
  const apiUrl = "https://api.github.com/repos/emebullon/copa/contents/";
  try {
    const response = await fetch(apiUrl);
    const files = await response.json();
    return files.filter(file => file.name.endsWith(".json")).map(file => file.download_url);
  } catch (error) {
    console.error("Error al obtener la lista de archivos:", error);
    return [];
  }
}

/***************************************
 * 2) CARGAR Y ACUMULAR ESTADÍSTICAS CON DETALLES DE PARTIDOS
 ***************************************/
async function loadAllStats() {
  const urls = await fetchMatchFiles();
  const playersMap = new Map();

  for (const url of urls) {
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      const comp = data.HEADER.competition || "";
      competitionSet.add(comp);

      const matchDate = data.HEADER.starttime || "";
      const scoreboardTeams = data.SCOREBOARD.TEAM;
      // Asumimos que scoreboardTeams[0] y [1] son los dos equipos
      const teamAName = scoreboardTeams[0].name || "Equipo A";
      const teamBName = scoreboardTeams[1].name || "Equipo B";

      scoreboardTeams.forEach((teamObj, index) => {
        const teamName = teamObj.name || "Equipo X";
        teamSet.add(teamName);

        // Determinar equipo rival
        const rivalName = (index === 0) ? teamBName : teamAName;

        // Género
        const femaleCompetitions = [
          "LF Endesa",
          "LF Challenge",
          "L.F. 2",
          "CE SSAA Cadete Fem.",
          "CE SSA Infantil Fem."
        ];
        let genero = "H";
        if (femaleCompetitions.some(f => f.toLowerCase() === comp.trim().toLowerCase())) {
          genero = "M";
        }

        (teamObj.PLAYER || []).forEach(player => {
          const playerId = `${player.id}-${teamName}-${comp}`;
          if (!playersMap.has(playerId)) {
            playersMap.set(playerId, {
              dorsal: player.no || "",
              playerPhoto: player.logo || "https://via.placeholder.com/50",
              playerName: player.name || "Desconocido",
              teamName,
              competition: comp,
              gender: genero,
              games: 0,
              pts: 0,
              t2i: 0,
              t2c: 0,
              t3i: 0,
              t3c: 0,
              tli: 0,
              tlc: 0,
              ro: 0,
              rd: 0,
              rt: 0,
              as: 0,
              br: 0,
              bp: 0,
              tp: 0,
              fc: 0,
              va: 0,
              pm: 0,
              matches: []
            });
          }
          const record = playersMap.get(playerId);
          record.games += 1;

          const p2a = parseInt(player.p2a || 0);
          const p2m = parseInt(player.p2m || 0);
          const p3a = parseInt(player.p3a || 0);
          const p3m = parseInt(player.p3m || 0);
          const p1a = parseInt(player.p1a || 0);
          const p1m = parseInt(player.p1m || 0);

          record.pts += parseInt(player.pts || 0);
          record.t2i += p2a;
          record.t2c += p2m;
          record.t3i += p3a;
          record.t3c += p3m;
          record.tli += p1a;
          record.tlc += p1m;
          record.ro += parseInt(player.ro || 0);
          record.rd += parseInt(player.rd || 0);
          record.rt += parseInt(player.rt || 0);
          record.as += parseInt(player.assist || 0);
          record.br += parseInt(player.st || 0);
          record.bp += parseInt(player.to || 0);
          record.tp += parseInt(player.bs || 0);
          record.fc += parseInt(player.pf || 0);
          record.va += parseInt(player.val || 0);
          record.pm += parseInt(player.pllss || 0);

          // Calcular porcentajes para este partido
          const pct2 = (p2a > 0) ? ((p2m / p2a) * 100).toFixed(1) : "0.0";
          const pct3 = (p3a > 0) ? ((p3m / p3a) * 100).toFixed(1) : "0.0";
          const pctTl = (p1a > 0) ? ((p1m / p1a) * 100).toFixed(1) : "0.0";

          // Agregar detalle del partido
          record.matches.push({
            matchDate,  // Fecha del partido
            rival: rivalName,
            pts: parseInt(player.pts || 0),
            t2i: p2a,
            t2c: p2m,
            pct2,
            t3i: p3a,
            t3c: p3m,
            pct3,
            tli: p1a,
            tlc: p1m,
            pctTl,
            ro: parseInt(player.ro || 0),
            rd: parseInt(player.rd || 0),
            rt: parseInt(player.rt || 0),
            as: parseInt(player.assist || 0),
            br: parseInt(player.st || 0),
            bp: parseInt(player.to || 0),
            tp: parseInt(player.bs || 0),
            fc: parseInt(player.pf || 0),
            va: parseInt(player.val || 0),
            pm: parseInt(player.pllss || 0)
          });
        });
      });
    } catch (err) {
      console.error("Error al cargar", url, err);
    }
  }

  allPlayersStats = Array.from(playersMap.values());
  fillSelects();
  applyFilters();
}

/***************************************
 * 3) LLENAR SELECTS
 ***************************************/
function fillSelects() {
  const filterCompetition = document.getElementById("filterCompetition");
  const filterTeam = document.getElementById("filterTeam");

  competitionSet.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    filterCompetition.appendChild(opt);
  });

  teamSet.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    filterTeam.appendChild(opt);
  });
}

/***************************************
 * 4) APLICAR FILTROS + PAGINACIÓN
 ***************************************/
function applyFilters() {
  const compSel = document.getElementById("filterCompetition").value;
  const teamSel = document.getElementById("filterTeam").value;
  const genderSel = document.getElementById("filterGender").value;
  const modeToggle = document.getElementById("modeToggle");
  const mode = modeToggle.checked ? "promedios" : "totales";
  const searchText = document.getElementById("searchPlayerTeam").value.toLowerCase();

  let filtered = allPlayersStats.filter(p => {
    if (compSel && p.competition !== compSel) return false;
    if (teamSel && p.teamName !== teamSel) return false;
    if (genderSel && p.gender !== genderSel) return false;
    if (searchText) {
      const nameMatch = p.playerName.toLowerCase().includes(searchText);
      const teamMatch = p.teamName.toLowerCase().includes(searchText);
      if (!nameMatch && !teamMatch) return false;
    }
    return true;
  });

  if (currentSortCol) {
    sortArray(filtered, currentSortCol, currentSortOrder, mode);
  }

  // PAGINACIÓN
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = filtered.slice(startIndex, endIndex);

  renderTable(paginated, mode);

  // Actualizar info de paginación
  const pageInfo = document.getElementById("pageInfo");
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  if (totalPages === 0) {
    pageInfo.textContent = "No hay datos";
  } else {
    pageInfo.textContent = `Página ${currentPage} / ${totalPages}`;
    if (currentPage > totalPages) {
      currentPage = totalPages;
      applyFilters();
    }
  }
}

/***************************************
 * 5) RENDERIZAR TABLA CON EXPANSIÓN DE DETALLES
 ***************************************/
function limitName(name, maxChars = 15) {
  if (name.length <= maxChars) return name;
  return name.slice(0, maxChars - 1) + "…";
}

// Función para obtener las iniciales del equipo
function getInitials(name) {
  return name
    .split(" ")
    .filter(word => word.length > 0)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

function renderTable(data, mode = "totales") {
  const tbody = document.querySelector("#statsTable tbody");
  tbody.innerHTML = "";

  data.forEach((p, idx) => {
    const factor = (mode === "promedios") ? (1 / (p.games || 1)) : 1;

    const pts = Math.round(p.pts * factor);
    const t2i = Math.round(p.t2i * factor);
    const t2c = Math.round(p.t2c * factor);
    const t3i = Math.round(p.t3i * factor);
    const t3c = Math.round(p.t3c * factor);
    const tli = Math.round(p.tli * factor);
    const tlc = Math.round(p.tlc * factor);
    const ro = Math.round(p.ro * factor);
    const rd = Math.round(p.rd * factor);
    const rt = Math.round(p.rt * factor);
    const as = Math.round(p.as * factor);
    const br = Math.round(p.br * factor);
    const bp = Math.round(p.bp * factor);
    const tp = Math.round(p.tp * factor);
    const fc = Math.round(p.fc * factor);
    const va = Math.round(p.va * factor);
    const pm = Math.round(p.pm * factor);

    const pct2 = t2i > 0 ? ((t2c / t2i) * 100).toFixed(1) + "%" : "0%";
    const pct3 = t3i > 0 ? ((t3c / t3i) * 100).toFixed(1) + "%" : "0%";
    const pctTl = tli > 0 ? ((tlc / tli) * 100).toFixed(1) + "%" : "0%";

    const shortName = limitName(p.playerName, 15);
    // Para el equipo, mostramos solo las iniciales y en hover se muestra el nombre completo
    const teamInitials = getInitials(p.teamName);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${p.dorsal}</td>
      <td><img src="${p.playerPhoto}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;" /></td>
      <td data-col="playerName">${shortName}</td>
      <td title="${p.teamName}">${teamInitials}</td>
      <td>${pts}</td>
      <td>${t2i}</td>
      <td>${t2c}</td>
      <td>${pct2}</td>
      <td>${t3i}</td>
      <td>${t3c}</td>
      <td>${pct3}</td>
      <td>${tli}</td>
      <td>${tlc}</td>
      <td>${pctTl}</td>
      <td>${ro}</td>
      <td>${rd}</td>
      <td>${rt}</td>
      <td>${as}</td>
      <td>${br}</td>
      <td>${bp}</td>
      <td>${tp}</td>
      <td>${fc}</td>
      <td>${va}</td>
      <td>${pm >= 0 ? "+" + pm : pm}</td>
      <td class="games-cell" style="cursor: pointer;" data-player-id="${p.playerId || idx}">${p.games}</td>
    `;
    // Listener para desplegar detalles al hacer clic en "Part." (celda de partidos)
    tr.querySelector(".games-cell").addEventListener("click", function() {
      toggleMatchDetails(this, p);
    });

    tbody.appendChild(tr);
  });
}

/**
 * Alterna la fila de detalles con los partidos
 */
function toggleMatchDetails(cell, player) {
  const currentRow = cell.parentNode;
  const nextRow = currentRow.nextElementSibling;
  if (nextRow && nextRow.classList.contains("details-row")) {
    nextRow.remove();
    return;
  }
  
  const detailsRow = document.createElement("tr");
  detailsRow.classList.add("details-row");
  const detailsCell = document.createElement("td");
  detailsCell.colSpan = currentRow.children.length;

  let subTableHTML = `<table class="match-details-table">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Rival</th>
        <th>PTS</th>
        <th>T2I</th>
        <th>T2C</th>
        <th>T2%</th>
        <th>T3I</th>
        <th>T3C</th>
        <th>T3%</th>
        <th>TLI</th>
        <th>TLC</th>
        <th>TL%</th>
        <th>RO</th>
        <th>RD</th>
        <th>RT</th>
        <th>AS</th>
        <th>BR</th>
        <th>BP</th>
        <th>TP</th>
        <th>FC</th>
        <th>VA</th>
        <th>+/-</th>
      </tr>
    </thead>
    <tbody>`;
  
  if (player.matches && player.matches.length > 0) {
    player.matches.forEach(match => {
      subTableHTML += `
        <tr>
          <td>${match.matchDate}</td>
          <td>${match.rival}</td>
          <td>${match.pts}</td>
          <td>${match.t2i}</td>
          <td>${match.t2c}</td>
          <td>${match.pct2}</td>
          <td>${match.t3i}</td>
          <td>${match.t3c}</td>
          <td>${match.pct3}</td>
          <td>${match.tli}</td>
          <td>${match.tlc}</td>
          <td>${match.pctTl}</td>
          <td>${match.ro}</td>
          <td>${match.rd}</td>
          <td>${match.rt}</td>
          <td>${match.as}</td>
          <td>${match.br}</td>
          <td>${match.bp}</td>
          <td>${match.tp}</td>
          <td>${match.fc}</td>
          <td>${match.va}</td>
          <td>${match.pm >= 0 ? "+" + match.pm : match.pm}</td>
        </tr>
      `;
    });
  } else {
    subTableHTML += `<tr><td colspan="22">No hay detalles disponibles</td></tr>`;
  }
  subTableHTML += `</tbody></table>`;
  
  detailsCell.innerHTML = subTableHTML;
  detailsRow.appendChild(detailsCell);
  currentRow.parentNode.insertBefore(detailsRow, currentRow.nextElementSibling);
}

/***************************************
 * 6) ORDENAR Y RESALTAR COLUMNA
 ***************************************/
function sortByColumn(colKey) {
  if (currentSortCol === colKey) {
    currentSortOrder = (currentSortOrder === "asc") ? "desc" : "asc";
  } else {
    currentSortCol = colKey;
    currentSortOrder = "desc";
  }
  currentPage = 1;
  applyFilters();
}

function sortArray(array, colKey, order, mode) {
  array.sort((a, b) => {
    const valA = getSortValue(a, colKey, mode);
    const valB = getSortValue(b, colKey, mode);
    if (typeof valA === "number" && typeof valB === "number") {
      return (order === "asc") ? (valA - valB) : (valB - valA);
    } else {
      const sA = valA.toString().toLowerCase();
      const sB = valB.toString().toLowerCase();
      if (sA < sB) return (order === "asc") ? -1 : 1;
      if (sA > sB) return (order === "asc") ? 1 : -1;
      return 0;
    }
  });
  highlightSortedColumn(colKey);
}

function getSortValue(obj, colKey, mode) {
  const factor = (mode === "promedios") ? (1 / (obj.games || 1)) : 1;
  if (colKey === "pts") return obj.pts * factor;
  if (colKey === "t2i") return obj.t2i * factor;
  if (colKey === "t2c") return obj.t2c * factor;
  if (colKey === "t3i") return obj.t3i * factor;
  if (colKey === "t3c") return obj.t3c * factor;
  if (colKey === "tli") return obj.tli * factor;
  if (colKey === "tlc") return obj.tlc * factor;
  if (colKey === "ro") return obj.ro * factor;
  if (colKey === "rd") return obj.rd * factor;
  if (colKey === "rt") return obj.rt * factor;
  if (colKey === "as") return obj.as * factor;
  if (colKey === "br") return obj.br * factor;
  if (colKey === "bp") return obj.bp * factor;
  if (colKey === "tp") return obj.tp * factor;
  if (colKey === "fc") return obj.fc * factor;
  if (colKey === "va") return obj.va * factor;
  if (colKey === "pm") return obj.pm * factor;

  if (colKey === "pct2") return (obj.t2i > 0) ? (obj.t2c / obj.t2i) * 100 : 0;
  if (colKey === "pct3") return (obj.t3i > 0) ? (obj.t3c / obj.t3i) * 100 : 0;
  if (colKey === "pctTl") return (obj.tli > 0) ? (obj.tlc / obj.tli) * 100 : 0;
  
  if (colKey === "playerPhoto") return obj.playerPhoto;
  
  return obj[colKey] || 0;
}

function highlightSortedColumn(colKey) {
  const ths = document.querySelectorAll("#statsTable thead th");
  ths.forEach(th => th.classList.remove("sorted-col"));
  const tds = document.querySelectorAll("#statsTable tbody td");
  tds.forEach(td => td.classList.remove("sorted-col"));

  const targetTh = document.querySelector(`#statsTable thead th[data-col="${colKey}"]`);
  if (!targetTh) return;
  targetTh.classList.add("sorted-col");

  const colIndex = Array.from(targetTh.parentNode.children).indexOf(targetTh);
  const rows = document.querySelectorAll("#statsTable tbody tr");
  rows.forEach(row => {
    const cell = row.children[colIndex];
    if (cell) {
      cell.classList.add("sorted-col");
    }
  });
}
