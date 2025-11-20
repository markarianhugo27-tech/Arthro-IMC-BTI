// Fichier: diag_gantt.js

document.addEventListener("DOMContentLoaded", () => {
  // 1. Chargement initial de Google Charts
  google.charts.load("current", { packages: ["gantt"] });
  google.charts.setOnLoadCallback(drawChart);

  // Fonction pour mapper les statuts de la tâche en pourcentage d'achèvement
  function getTaskProgress(status) {
    switch (status) {
      case "Terminé":
        return 100;
      case "En Cours":
        return 50;
      case "Bloqué":
        return 0; // Bloqué est traité comme 0% d'avancement
      case "À Faire":
      default:
        return 0;
    }
  }

  function drawChart() {
    const data = new google.visualization.DataTable();

    // Définition des colonnes requises par Google Gantt Chart
    data.addColumn("string", "Task ID");
    data.addColumn("string", "Task Name");
    data.addColumn("string", "Resource"); // Utilisé pour le Nom du Groupe
    data.addColumn("date", "Start Date");
    data.addColumn("date", "End Date");
    data.addColumn("number", "Duration");
    data.addColumn("number", "Percent Complete");
    data.addColumn("string", "Dependencies");

    const rows = [];
    const today = new Date();

    // 2. Récupération des données sauvegardées
    // NOTE: La clé 'mondayPlanificationData' est supposée être la clé utilisée par planification.js
    const storedData = localStorage.getItem("mondayPlanificationData");

    if (storedData) {
      const planificationData = JSON.parse(storedData);

      planificationData.forEach((group) => {
        const groupName = group.name;

        group.tasks.forEach((task) => {
          // Utilise la date d'ajout (obligatoire) comme date de début
          let startDate = task.dateAdded ? new Date(task.dateAdded) : today;
          // Utilise la date d'échéance comme date de fin
          let endDate = task.dueDate ? new Date(task.dueDate) : null;

          // Validation des dates
          if (!endDate || isNaN(endDate) || endDate <= startDate) {
            // Si la date de fin est manquante ou antérieure/égale à la date de début,
            // on donne une durée minimale d'un jour pour tracer la barre.
            endDate = new Date(startDate.getTime());
            endDate.setDate(endDate.getDate() + 1);
          }

          rows.push([
            task.id, // Task ID (unique)
            task.name, // Task Name
            groupName, // Nom du Groupe (Resource)
            startDate, // Start Date
            endDate, // End Date
            null, // Duration (Calculé automatiquement)
            getTaskProgress(task.status), // Avancement (%)
            null, // Dependencies
          ]);
        });
      });
    }

    const container = document.getElementById("gantt_chart_container");
    if (rows.length === 0) {
      container.innerHTML =
        "<p>Aucune tâche trouvée pour le diagramme. Veuillez vérifier la page Planification.</p>";
      return;
    }

    data.addRows(rows);

    // 3. Options de style et d'affichage
    const options = {
      height: Math.max(500, rows.length * 40 + 50), // Hauteur ajustée
      gantt: {
        criticalPathEnabled: false,
        trackHeight: 35,
        // Palettes de couleurs
        palette: [
          { color: "#0077b6", dark: "#1e3a5f" },
          { color: "#ff9900", dark: "#cc7a00" },
          { color: "#28a745", dark: "#1c742c" },
          { color: "#7b4f9d", dark: "#5e3c79" },
        ],
      },
    };

    // 4. Dessin du diagramme
    const chart = new google.visualization.Gantt(container);
    chart.draw(data, options);
  }
});
