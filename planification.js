/*
 * Fichier JavaScript spécifique à la page Planification (Style Monday.com)
 * Version Firebase CORRIGÉE pour synchronisation en temps réel.
 */

// =========================================================
// SÉCURITÉ : VÉRIFICATION DU CODE D'ACCÈS
// =========================================================

const ACCESS_CODE = "BTI";

function checkAccessCode() {
  if (sessionStorage.getItem("planificationAccess") === "granted") {
    return true;
  }

  const enteredCode = prompt(
    "Veuillez entrer le code d'accès à la planification :"
  );

  if (enteredCode === ACCESS_CODE) {
    sessionStorage.setItem("planificationAccess", "granted");
    return true;
  } else {
    alert("Code d'accès incorrect. Accès refusé.");
    return false;
  }
}

// =========================================================
// 0. DÉCLARATIONS GLOBALES
// =========================================================

let planificationGrid;
const groupHeaderColors = ["blue", "orange", "green", "purple", "red"];

let taskIdCounter = 5;
let currentGroupIndex = 0;
let currentResponsables = [
  "Groupe",
  "Hugo",
  "Jérémy",
  "Lucas",
  "Marc",
  "Nathan",
  "Sophie",
].sort();

let draggedElement = null;
let dragOverPlaceholder = null;

let handleGroupDragStart;
let handleTaskDragStart;
let handleDescriptionClick;

// =========================================================
// 1. UTILS & GESTION FIREBASE (SAUVEGARDE ET CHARGEMENT)
// =========================================================

function createResponsableTag(name) {
  return `<span class="responsable-tag-planif" data-name="${name}">
                    ${name} <span class="remove-resp-planif">×</span>
                </span>`;
}

function closeAllPopups() {
  const popups = document.querySelectorAll(".planning-popup");
  if (popups.length > 0) {
    saveData(); // L'appel à saveData doit être présent ici
    popups.forEach((popup) => popup.remove());
    document.removeEventListener("click", closeAllPopups);
  }
}

function collectData() {
  // Collecte les données du DOM pour la sauvegarde
  const groups = [];
  planificationGrid
    .querySelectorAll(".group-container")
    .forEach((container) => {
      const tasks = [];

      container.querySelectorAll(".task-row").forEach((row) => {
        const assigneCell = row.querySelector(".assigne");

        // Rendre la lecture de l'attribut Responsables plus robuste
        let responsablesAttr = assigneCell.getAttribute("data-responsables");

        if (!responsablesAttr || responsablesAttr === "undefined") {
          responsablesAttr = "[]";
        }

        tasks.push({
          id: row.getAttribute("data-id"),
          name: row.querySelector(".task-name").textContent,
          status: row.querySelector(".status").getAttribute("data-status"),
          priorite: row
            .querySelector(".priorite")
            .getAttribute("data-priorite"),
          responsables: JSON.parse(responsablesAttr),
          date: row.querySelector(".date-echeance").getAttribute("data-date"),
          description: row.getAttribute("data-description") || "",
        });
      });

      // Assurer que les tâches sont un tableau dans le modèle
      let tasksArray = groups.tasks || [];

      groups.push({
        name: container.getAttribute("data-name"),
        color: container.getAttribute("data-color"),
        tasks: tasks, // C'est 'tasks' qui est le tableau des tâches
      });
    });

  return groups;
}

/**
 * [FIREBASE] Sauvegarde la structure de la grille dans la base de données.
 */
function saveData() {
  // 'db' est défini dans planification.html
  if (typeof db === "undefined") {
    console.error("Firebase 'db' non défini. Vérifiez planification.html.");
    return;
  }
  const groups = collectData();

  db.ref("project_tasks")
    .set(groups)
    .catch((error) => {
      console.error("Erreur d'écriture sur Firebase:", error);
    });
}

/**
 * [FIREBASE] Initialise une structure de grille de base si la base de données est vide.
 */
function initializeEmptyGrid() {
  console.log("Initialisation d'une grille vide.");

  // Crée le groupe par défaut pour éviter que la grille ne soit vide
  const defaultGroupName = "Étape 1: Initialisation & Analyse";
  const group1 = createNewGroupContainer(defaultGroupName, "blue");
  planificationGrid.appendChild(group1);

  saveData();
}

/**
 * Construit et ajoute la ligne d'en-tête de colonne.
 */
function appendHeaderRow() {
  const headerRow = document.createElement("div");
  headerRow.className = "header-row monday-row";
  headerRow.innerHTML = `
        <div class="column-title task-name">Nom de la Tâche</div>
        <div class="column-title status">Statut</div>
        <div class="column-title assigne">Responsable</div>
        <div class="column-title date-echeance">Échéance</div>
        <div class="column-title priorite">Priorité</div>
        <div class="column-title" style="width: 30px"></div>
    `;
  planificationGrid.prepend(headerRow); // Utiliser prepend pour s'assurer qu'il est en haut
}

function createNewGroupContainer(name, color) {
  const newGroupContainer = document.createElement("div");
  newGroupContainer.className = "group-container";
  newGroupContainer.setAttribute("data-name", name);
  newGroupContainer.setAttribute("data-color", color);

  newGroupContainer.innerHTML = `
        <div class="group-header group-header-${color}">
            <h3>${name}</h3>
        </div>
        <div class="task-list">
            </div>
    `;

  return newGroupContainer;
}

function createNewTaskRow(taskData, taskList) {
  const row = document.createElement("div");
  row.className = "task-row monday-row";
  row.setAttribute("draggable", "true");
  row.setAttribute("data-id", taskData.id);
  row.setAttribute("data-description", taskData.description || "");

  // Remplissage du HTML avec les données
  row.innerHTML = `
        <div class="task-name" contenteditable="true">${taskData.name}</div>
        <div class="status status-${taskData.status
          .toLowerCase()
          .replace(/é/g, "e")
          .replace(/ /g, "")}" data-status="${taskData.status}">${
    taskData.status
  }</div>
        <div class="assigne clickable-field" data-responsables='${JSON.stringify(
          taskData.responsables
        )}'></div>
        <div class="date-echeance clickable-field" data-date="${
          taskData.date || ""
        }"></div>
        <div class="priorite priorite-${taskData.priorite.toLowerCase()}" data-priorite="${
    taskData.priorite
  }">${taskData.priorite}</div>
        <div class="task-description-icon" title="Ajouter/Modifier la description">📝</div>
    `;

  // Rendu dynamique (IMPORTANT)
  const assigneCell = row.querySelector(".assigne");
  const dateCell = row.querySelector(".date-echeance");

  // Ces fonctions DOIVENT exister dans votre code (elles sont définies plus loin)
  if (typeof renderResponsables !== "undefined") {
    renderResponsables(assigneCell, taskData.responsables);
  }
  if (typeof renderDate !== "undefined") {
    renderDate(dateCell, taskData.date);
  }

  if (taskList) {
    taskList.appendChild(row);
  }
  return row;
}

// =========================================================
// 3. SYNCHRONISATION EN TEMPS RÉEL (VERSION FINALE)
// =========================================================

/**
 * [FIREBASE] Lance l'écoute en temps réel pour charger et synchroniser les données.
 */
function startRealtimeSync() {
  // 'on' écoute et se déclenche après la réception des données
  db.ref("project_tasks").on(
    "value",
    (snapshot) => {
      const data = snapshot.val();

      // 1. Vider la grille pour la reconstruire
      planificationGrid.innerHTML = "";

      // *** CORRECTION 1: Ajout de l'en-tête de colonne ***
      appendHeaderRow();

      // Assurez-vous que data est un tableau pour l'itération des groupes
      const groupsData = data || [];

      if (groupsData && groupsData.length > 0) {
        console.log("Données reçues de Firebase (Temps Réel).");

        // 2. BOUCLE DE RECONSTRUCTION DEPUIS FIREBASE
        groupsData.forEach((groupData) => {
          // Si groupData n'est pas valide, on passe au suivant (sécurité supplémentaire)
          if (!groupData || !groupData.name || !groupData.color) return;

          const groupContainer = createNewGroupContainer(
            groupData.name,
            groupData.color
          );
          planificationGrid.appendChild(groupContainer);

          // CORRECTION CRITIQUE : Utiliser || [] pour garantir un tableau de tâches
          const tasksList = groupData.tasks || [];

          tasksList.forEach((taskData) => {
            const taskRow = createNewTaskRow(
              taskData,
              groupContainer.querySelector(".task-list")
            );
            setupTaskInteractivity(taskRow); // Rattache les événements de t^ache
          });
        });
      } else {
        // Cas où la base de données est vide (premier lancement)
        initializeEmptyGrid();
      }

      // --- 3. LOGIQUE DE RATTACHEMENT DES ÉVÉNEMENTS FINAUX ---

      // Rattachement des événements d'édition de groupe et d'interaction
      planificationGrid
        .querySelectorAll(".group-container")
        .forEach((container) => {
          // On s'assure que le header existe avant d'appeler setupGroupEditing
          const header = container.querySelector(".group-header");
          if (header) {
            setupGroupEditing(header, container);
          }

          // On s'assure que toutes les tâches ont bien leurs événements
          container.querySelectorAll(".task-row").forEach((row) => {
            setupTaskInteractivity(row);
          });
        });

      // 4. Finalisation : Ajout des lignes d'entrée et Drag & Drop
      appendNewTaskAndGroupInputRows();
      setupDragAndDrop();
    },
    (error) => {
      console.error("Erreur de lecture Firebase:", error);
      alert(
        "Impossible de charger les données partagées. Vérifiez la console Firebase."
      );
    }
  );
}

function updateGroupDisplay(container) {
  const name = container.getAttribute("data-name");
  const color = container.getAttribute("data-color");
  const header = container.querySelector(".group-header");

  // *** CORRECTION 2: S'assurer que le header met à jour son nom de classe ***
  header.className = `group-header group-header-${color}`;
  header.innerHTML = `<h3>${name}</h3>`;

  setupGroupEditing(header, container);
  saveData();
}

function setupGroupEditing(header, container) {
  const h3 = header.querySelector("h3");
  h3.replaceWith(h3.cloneNode(true));
  const newH3 = header.querySelector("h3");

  newH3.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAllPopups();
    openGroupEditPopup(header, container);
  });

  header.setAttribute("draggable", "true");
  header.removeEventListener("dragstart", handleGroupDragStart);
  header.addEventListener(
    "dragstart",
    (handleGroupDragStart = (e) => {
      draggedElement = container;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => container.classList.add("dragging"), 0);
    })
  );
}

function openGroupEditPopup(header, container) {
  const currentName = container.getAttribute("data-name");
  const currentColor = container.getAttribute("data-color");

  const popup = document.createElement("div");
  popup.className = "planning-popup group-editor";
  popup.addEventListener("click", (e) => e.stopPropagation());

  const colorsHtml = groupHeaderColors
    .map(
      (color) => `
            <button class="btn-color-select group-color-${color}" data-color="${color}" 
                    style="border: 3px solid ${
                      currentColor === color ? "#333" : "transparent"
                    };">
            </button>
        `
    )
    .join("");

  popup.innerHTML = `
            <h4>Modifier l'étape</h4>
            <input type="text" value="${currentName}" class="input-group-name-edit" />
            
            <div class="color-picker-container">
                <label>Couleur du bandeau :</label>
                <div class="color-options">${colorsHtml}</div>
            </div>
            
            <button class="btn-save-group btn-action-save">Sauvegarder</button>
            <button class="btn-delete-group btn-action-cancel">Supprimer l'étape</button>
        `;

  const rect = header.getBoundingClientRect();
  popup.style.top = `${rect.bottom + window.scrollY}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;

  document.body.appendChild(popup);

  popup.querySelectorAll(".btn-color-select").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const newColor = e.currentTarget.getAttribute("data-color");
      container.setAttribute("data-color", newColor);

      // Met à jour visuellement le header du groupe pendant l'édition
      const groupHeader = container.querySelector(".group-header");
      groupHeader.className = `group-header group-header-${newColor}`;

      popup
        .querySelectorAll(".btn-color-select")
        .forEach((b) => (b.style.borderColor = "transparent"));
      e.currentTarget.style.borderColor = "#333";
    });
  });

  popup.querySelector(".btn-save-group").addEventListener("click", () => {
    const newName = popup.querySelector(".input-group-name-edit").value.trim();
    container.setAttribute("data-name", newName);
    updateGroupDisplay(container); // Ceci sauvegarde et met à jour
    closeAllPopups();
  });

  popup.querySelector(".btn-delete-group").addEventListener("click", () => {
    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer l'étape "${currentName}" et toutes ses tâches ?`
      )
    ) {
      container.remove();
      saveData();
      closeAllPopups();
    }
  });

  setTimeout(() => {
    document.addEventListener("click", closeAllPopups, { once: true });
  }, 0);
}

function createGroupInputRow() {
  const inputRow = document.createElement("div");
  inputRow.className = "group-header group-header-input";

  const colorName =
    groupHeaderColors[currentGroupIndex % groupHeaderColors.length];
  currentGroupIndex++;
  inputRow.classList.add(`group-header-${colorName}`);

  inputRow.innerHTML = `
            <input type="text" placeholder="Nom de la nouvelle étape (Ex: Étape 3: Publication)" class="input-group-name" />
            <button class="btn-add-group">Ajouter Étape</button>
        `;

  const inputField = inputRow.querySelector(".input-group-name");
  const addButton = inputRow.querySelector(".btn-add-group");

  addButton.addEventListener("click", () => {
    const newGroupName = inputField.value.trim();
    if (newGroupName) {
      const newGroupContainer = document.createElement("div");
      newGroupContainer.className = "group-container";
      newGroupContainer.setAttribute("data-name", newGroupName);
      newGroupContainer.setAttribute("data-color", colorName);

      newGroupContainer.innerHTML = `
                    <div class="group-header group-header-${colorName}">
                        <h3>${newGroupName}</h3>
                    </div>
                    <div class="task-list"></div>
                `;

      planificationGrid.insertBefore(newGroupContainer, inputRow);
      setupGroupEditing(
        newGroupContainer.querySelector(".group-header"),
        newGroupContainer
      );

      planificationGrid.removeChild(inputRow);
      appendNewTaskAndGroupInputRows();
      saveData();
    } else {
      alert("Veuillez entrer un nom pour la nouvelle étape.");
    }
  });

  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addButton.click();
    }
  });

  return inputRow;
}

// =========================================================
// 2. GESTION DES TACHES & AJOUT
// =========================================================

// Note: Cette fonction crée une nouvelle tâche AVEC la valeur par défaut pour l'input row
function createNewTaskRowDefault() {
  taskIdCounter++;
  const row = document.createElement("div");
  row.className = "task-row monday-row";
  row.setAttribute("draggable", "true");
  row.setAttribute("data-id", `T${taskIdCounter}`);
  row.setAttribute("data-description", "");

  // ATTENTION: Ajout de tabindex="-1" pour supprimer le focus
  row.innerHTML = `
            <div class="task-name" contenteditable="true">Nouvelle tâche sans nom</div>
            <div class="status status-todo" data-status="À Faire" tabindex="-1">À Faire</div>
            <div class="assigne clickable-field" data-responsables="[]">Ajouter...</div>
            <div class="date-echeance clickable-field" data-date="">Ajouter...</div>
            <div class="priorite priorite-basse" data-priorite="Basse" tabindex="-1">Basse</div>
            <div class="task-description-icon" title="Ajouter/Modifier la description">📝</div>
        `;

  const assigneCell = row.querySelector(".assigne");
  const dateCell = row.querySelector(".date-echeance");

  renderResponsables(assigneCell, []);
  renderDate(dateCell, "");

  setupTaskInteractivity(row);

  return row;
}
// Correction du nom de la fonction pour éviter la confusion avec createNewTaskRow(taskData, taskList)
const createNewTaskRowForInput = createNewTaskRowDefault;

function createNewTaskInputRow() {
  const inputRow = document.createElement("div");
  inputRow.className = "task-input-row monday-row";

  // Correction de l'innerHTML pour éviter le TypeError
  inputRow.innerHTML = `
            <div style="grid-column: 1 / 6; text-align: center;">
                <button id="btn-add-new-task" class="btn-action-save" style="width: 100%; border-radius: 0;">➕ Ajouter une tâche</button>
            </div>
        `;

  inputRow.querySelector("#btn-add-new-task").addEventListener("click", () => {
    const newTask = createNewTaskRowForInput();

    // Logique corrigée pour trouver le dernier groupe, même si nouvellement créé
    const groupContainers =
      planificationGrid.querySelectorAll(".group-container");
    const lastGroup = groupContainers[groupContainers.length - 1];

    if (lastGroup) {
      // Le task-list est à l'intérieur du group-container
      let taskList = lastGroup.querySelector(".task-list");
      if (!taskList) {
        taskList = document.createElement("div");
        taskList.classList.add("task-list");
        lastGroup.appendChild(taskList);
      }
      taskList.appendChild(newTask);
    } else {
      // Logique fallback si aucun groupe n'existe (devrait être initialisé par initializeEmptyGrid)
      const inputTaskRow = planificationGrid.querySelector(".task-input-row");
      if (inputTaskRow) {
        planificationGrid.insertBefore(newTask, inputTaskRow);
      } else {
        planificationGrid.appendChild(newTask);
      }
    }
    saveData();
  });

  return inputRow;
}

function appendNewTaskAndGroupInputRows() {
  const oldInputRows = planificationGrid.querySelectorAll(
    ".task-input-row, .group-header-input"
  );
  oldInputRows.forEach((row) => row.remove());

  planificationGrid.appendChild(createNewTaskInputRow());
  planificationGrid.appendChild(createGroupInputRow());
}

// =========================================================
// 3. GESTION DES CHAMPS DYNAMIQUES
// =========================================================
function setupEditableCells(row) {
  // Rend le nom de la tâche éditable et sauvegarde après la modification
  const taskNameCell = row.querySelector(".task-name");

  // Événement : Perte de focus (Blur)
  taskNameCell.addEventListener("blur", () => {
    saveData();
  });

  // Événement : Touche Entrée
  taskNameCell.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Empêche le saut de ligne
      taskNameCell.blur(); // Déclenche la sauvegarde
    }
  });
}

const statusCycle = [
  { class: "status-todo", text: "À Faire" },
  { class: "status-inprogress", text: "En Cours" },
  { class: "status-done", text: "Terminé" },
  { class: "status-blocked", text: "Bloqué" },
];

const prioriteCycle = [
  { class: "priorite-basse", text: "Basse" },
  { class: "priorite-moyenne", text: "Moyenne" },
  { class: "priorite-haute", text: "Haute" },
];

function cycleTag(element, cycle, dataAttribute) {
  const currentText = element.textContent.trim();
  let currentIndex = cycle.findIndex((item) => item.text === currentText);

  let nextIndex = (currentIndex + 1) % cycle.length;
  const nextItem = cycle[nextIndex];

  cycle.forEach((item) => element.classList.remove(item.class));

  element.classList.add(nextItem.class);
  element.textContent = nextItem.text;
  element.setAttribute(dataAttribute, nextItem.text);

  saveData();
}

function setupTagListeners(container) {
  const statusElement = container.querySelector(".status");
  if (statusElement) {
    statusElement.addEventListener("click", (e) => {
      cycleTag(e.currentTarget, statusCycle, "data-status");
    });
  }

  const prioriteElement = container.querySelector(".priorite");
  if (prioriteElement) {
    prioriteElement.addEventListener("click", (e) => {
      cycleTag(e.currentTarget, prioriteCycle, "data-priorite");
    });
  }
}

// --- RESPONSABLES ---

function renderResponsables(cell, names) {
  if (!names || names.length === 0) {
    cell.innerHTML = "Ajouter...";
    cell.classList.add("placeholder");
  } else {
    const sortedNames = names.sort((a, b) => {
      if (a === "Groupe") return -1;
      if (b === "Groupe") return 1;
      return a.localeCompare(b);
    });

    cell.innerHTML = sortedNames.map(createResponsableTag).join("");
    cell.classList.remove("placeholder");

    cell.querySelectorAll(".remove-resp-planif").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tag = e.target.closest(".responsable-tag-planif");
        const nameToRemove = tag.getAttribute("data-name");

        const currentNames = JSON.parse(
          cell.getAttribute("data-responsables") || "[]"
        );
        const newNames = currentNames.filter((n) => n !== nameToRemove);

        cell.setAttribute("data-responsables", JSON.stringify(newNames));
        renderResponsables(cell, newNames);
        saveData();
      });
    });
  }
}

function openResponsablePopup(cell) {
  // Rendre la lecture de l'attribut Responsables plus robuste pour le popup
  let responsablesAttr = cell.getAttribute("data-responsables");

  // Si l'attribut est null, indéfini, ou la chaîne "undefined", utilise "[]"
  if (!responsablesAttr || responsablesAttr === "undefined") {
    responsablesAttr = "[]";
  }

  const currentNames = JSON.parse(responsablesAttr); // Utilisation de la variable sécurisée

  const popup = document.createElement("div");
  popup.className = "planning-popup responsable-selector";
  popup.addEventListener("click", (e) => e.stopPropagation());

  const optionsHtml = currentResponsables
    .map((name) => {
      const isChecked = currentNames.includes(name) ? "checked" : "";
      const canBeDeleted =
        name !== "Groupe"
          ? `<button class="btn-delete-resp" data-name="${name}">Supprimer</button>`
          : "";

      return `
                <div class="resp-option-line">
                    <label class="resp-option">
                        <input type="checkbox" value="${name}" ${isChecked}>
                        ${name}
                    </label>
                    ${canBeDeleted}
                </div>
            `;
    })
    .join("");

  popup.innerHTML = `
            <div class="resp-list">${optionsHtml}</div>
            <div class="resp-add">
                <input type="text" placeholder="Ajouter un nouveau nom" class="input-new-resp" />
                <button class="btn-add-resp">Ajouter</button>
            </div>
        `;

  const rect = cell.getBoundingClientRect();
  popup.style.top = `${rect.bottom + window.scrollY}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;

  document.body.appendChild(popup);

  popup.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const newSelectedNames = Array.from(
        popup.querySelectorAll('input[type="checkbox"]:checked')
      ).map((cb) => cb.value);
      cell.setAttribute("data-responsables", JSON.stringify(newSelectedNames));
      renderResponsables(cell, newSelectedNames);
    });
  });

  const inputNewResp = popup.querySelector(".input-new-resp");
  popup.querySelector(".btn-add-resp").addEventListener("click", () => {
    const newName = inputNewResp.value.trim();
    if (newName && !currentResponsables.includes(newName)) {
      currentResponsables.push(newName);
      currentResponsables.sort();

      closeAllPopups();
      openResponsablePopup(cell);

      const newlyAddedCheckbox = document.querySelector(
        `.responsable-selector input[value="${newName}"]`
      );
      if (newlyAddedCheckbox) {
        newlyAddedCheckbox.checked = true;
        newlyAddedCheckbox.dispatchEvent(new Event("change"));
      }
    }
  });

  popup.querySelectorAll(".btn-delete-resp").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const nameToDelete = e.currentTarget.getAttribute("data-name");
      if (
        confirm(
          `Êtes-vous sûr de vouloir supprimer ${nameToDelete} de la liste globale des responsables ?`
        )
      ) {
        currentResponsables = currentResponsables.filter(
          (name) => name !== nameToDelete
        );

        const selectedNames = JSON.parse(
          cell.getAttribute("data-responsables") || "[]"
        );
        const newSelectedNames = selectedNames.filter(
          (name) => name !== nameToDelete
        );

        cell.setAttribute(
          "data-responsables",
          JSON.stringify(newSelectedNames)
        );
        renderResponsables(cell, newSelectedNames);

        closeAllPopups();
        openResponsablePopup(cell);
      }
    });
  });

  setTimeout(() => {
    document.addEventListener("click", closeAllPopups, { once: true });
  }, 0);
}

function setupResponsableSelector(cell) {
  cell.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAllPopups();
    openResponsablePopup(cell);
  });
}

// --- DATES ---

function renderDate(cell, dateString) {
  if (!dateString || dateString.length === 0) {
    cell.innerHTML = "Ajouter...";
    cell.classList.add("placeholder");
  } else {
    try {
      const date = new Date(dateString);
      const formatter = new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
      });
      cell.innerHTML = formatter.format(date);
    } catch (e) {
      cell.innerHTML = dateString;
    }
    cell.classList.remove("placeholder");
  }
}

function setupDatePicker(cell) {
  cell.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAllPopups();

    const popup = document.createElement("div");
    popup.className = "planning-popup date-picker";
    popup.addEventListener("click", (e) => e.stopPropagation());

    popup.innerHTML = `
                <input type="date" class="input-date-select" value="${cell.getAttribute(
                  "data-date"
                )}" />
                <button class="btn-clear-date">Effacer</button>
            `;

    const rect = cell.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(popup);

    const dateInput = popup.querySelector(".input-date-select");
    dateInput.focus();

    dateInput.addEventListener("change", () => {
      const newDate = dateInput.value;
      cell.setAttribute("data-date", newDate);
      renderDate(cell, newDate);
      closeAllPopups();
    });

    popup.querySelector(".btn-clear-date").addEventListener("click", () => {
      cell.setAttribute("data-date", "");
      renderDate(cell, "");
      closeAllPopups();
    });

    setTimeout(() => {
      document.addEventListener("click", closeAllPopups, { once: true });
    }, 0);
  });
}

// =========================================================
// 4. GESTION DE LA DESCRIPTION
// =========================================================

function setupDescriptionEditing(taskRow) {
  const icon = taskRow.querySelector(".task-description-icon");
  const currentDescription = taskRow.getAttribute("data-description");

  if (!icon) return;

  if (currentDescription && currentDescription.trim() !== "") {
    icon.classList.add("has-description");
  } else {
    icon.classList.remove("has-description");
  }

  icon.removeEventListener("click", handleDescriptionClick);
  icon.addEventListener(
    "click",
    (handleDescriptionClick = (e) => {
      e.stopPropagation();
      closeAllPopups();
      openDescriptionPopup(taskRow);
    })
  );
}

function openDescriptionPopup(taskRow) {
  const currentDescription = taskRow.getAttribute("data-description");
  const taskName = taskRow.querySelector(".task-name").textContent;

  const popup = document.createElement("div");
  popup.className = "planning-popup description-editor";
  popup.addEventListener("click", (e) => e.stopPropagation());

  popup.innerHTML = `
            <h4>Description : ${taskName}</h4>
            <textarea class="input-description-edit" placeholder="Ajoutez une description détaillée de la tâche">${currentDescription}</textarea>
            <button class="btn-save-desc btn-action-save">Sauvegarder</button>
        `;

  const rect = taskRow.getBoundingClientRect();
  popup.style.top = `${rect.bottom + window.scrollY - 10}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;

  document.body.appendChild(popup);

  popup.querySelector(".btn-save-desc").addEventListener("click", () => {
    const newDescription = popup
      .querySelector(".input-description-edit")
      .value.trim();
    taskRow.setAttribute("data-description", newDescription);
    setupDescriptionEditing(taskRow);
    closeAllPopups();
  });

  setTimeout(() => {
    document.addEventListener("click", closeAllPopups, { once: true });
  }, 0);
}

// =========================================================
// 5. DRAG AND DROP (Glisser-Déposer)
// =========================================================

function setupDragAndDrop() {
  planificationGrid.addEventListener("dragover", (e) => {
    e.preventDefault();
    const target = e.target.closest(
      ".task-row, .group-header, .group-container, .task-input-row"
    );
    if (!target || !draggedElement) return;

    removePlaceholder();

    if (
      target === draggedElement ||
      target.closest(".group-container") === draggedElement
    )
      return;

    const isDraggingGroup =
      draggedElement.classList.contains("group-container");
    const mouseY = e.clientY;

    if (isDraggingGroup) {
      const targetGroup = target.closest(".group-container");
      if (targetGroup && targetGroup !== draggedElement) {
        insertPlaceholder(targetGroup, mouseY);
      }
    } else {
      if (target.classList.contains("task-row")) {
        insertPlaceholder(target, mouseY);
      } else if (target.classList.contains("group-header")) {
        const container = target.closest(".group-container");
        const taskList = container.querySelector(".task-list");
        const firstTask = taskList ? taskList.querySelector(".task-row") : null;
        if (firstTask) {
          insertPlaceholder(firstTask, mouseY, true);
        } else if (taskList) {
          const placeholder = document.createElement("div");
          placeholder.className = "drag-placeholder";
          taskList.appendChild(placeholder);
          dragOverPlaceholder = placeholder;
        }
      }
    }
  });

  planificationGrid.addEventListener("dragleave", () => {
    setTimeout(removePlaceholder, 50);
  });

  planificationGrid.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!draggedElement) return;

    if (dragOverPlaceholder) {
      const targetElement = dragOverPlaceholder.nextSibling;
      const parentContainer = dragOverPlaceholder.parentNode;

      parentContainer.insertBefore(draggedElement, targetElement);
    } else {
      // Fallback: Si on drop directement sur un group-header sans placeholder
      const target = e.target.closest(".group-header");
      if (target) {
        // Ajoute en fin de liste de tâches du groupe
        const taskList = target
          .closest(".group-container")
          .querySelector(".task-list");
        if (taskList) {
          taskList.appendChild(draggedElement);
        }
      }
    }

    draggedElement.classList.remove("dragging");
    removePlaceholder();
    draggedElement = null;
    saveData();
  });

  planificationGrid.addEventListener("dragend", () => {
    planificationGrid
      .querySelectorAll(".dragging")
      .forEach((el) => el.classList.remove("dragging"));
    removePlaceholder();
    draggedElement = null;
  });
}

function insertPlaceholder(targetElement, clientY, forceBefore = false) {
  if (!dragOverPlaceholder) {
    dragOverPlaceholder = document.createElement("div");
    dragOverPlaceholder.className = "drag-placeholder";
  }

  const rect = targetElement.getBoundingClientRect();

  if (forceBefore || clientY < rect.top + rect.height / 2) {
    targetElement.parentNode.insertBefore(dragOverPlaceholder, targetElement);
  } else {
    targetElement.parentNode.insertBefore(
      dragOverPlaceholder,
      targetElement.nextSibling
    );
  }
}

function removePlaceholder() {
  if (dragOverPlaceholder) {
    dragOverPlaceholder.remove();
    dragOverPlaceholder = null;
  }
}

// =========================================================
// 6. INITIALISATION GLOBALE
// =========================================================

function setupTaskInteractivity(row) {
  setupEditableCells(row);
  setupTagListeners(row);
  setupResponsableSelector(row.querySelector(".assigne"));
  setupDatePicker(row.querySelector(".date-echeance"));
  setupDescriptionEditing(row);

  // Drag start task
  row.removeEventListener("dragstart", handleTaskDragStart);
  row.addEventListener(
    "dragstart",
    (handleTaskDragStart = (e) => {
      draggedElement = row;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => row.classList.add("dragging"), 0);
    })
  );
}

// =========================================================
// --- EXECUTION AU CHARGEMENT (BLOC UNIQUE ET CORRECT) ---
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Définition de la variable globale DOM
  planificationGrid = document.getElementById("planification-grid");

  // Si la grille n'est pas trouvée, on arrête.
  if (!planificationGrid) {
    console.error("Élément planification-grid manquant.");
    return;
  }

  // 2. SÉCURITÉ : Vérifie le code d'accès
  if (!checkAccessCode()) {
    // Si l'accès est refusé, on masque le contenu et on arrête l'exécution
    const mainContent = document.querySelector(".main-grid");
    if (mainContent) {
      mainContent.innerHTML =
        "<h2>🔒 Accès Restreint</h2><p>Veuillez recharger la page et entrer le code correct.</p>";
    }
    return;
  }

  // 3. SYNCHRONISATION : Démarre le chargement et l'écoute en temps réel
  startRealtimeSync();

  // 4. AFFICHAGE : Affiche la grille
  planificationGrid.style.display = "grid";

  console.log(
    "Planification Monday-like initialisée et synchronisation Firebase démarrée."
  );
});
