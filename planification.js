/*
 * Fichier JavaScript spécifique à la page Planification (Style Monday.com)
 * Version STABLE et COMPLÈTE avec Sauvegarde Automatique et Persistance Totale.
 */
/*
 * Fichier JavaScript spécifique à la page Planification (Style Monday.com)
 * Version STABLE et COMPLÈTE avec Sauvegarde Automatique et Persistance Totale.
 */

// =========================================================
// SÉCURITÉ : VÉRIFICATION DU CODE D'ACCÈS
// =========================================================

const ACCESS_CODE = "BTI"; // <<--- MODIFIEZ CE CODE D'ACCÈS

function checkAccessCode() {
  // 1. Tente de récupérer le statut de connexion (pour éviter de redemander le code si déjà entré)
  if (sessionStorage.getItem("planificationAccess") === "granted") {
    return true;
  }

  const enteredCode = prompt(
    "Veuillez entrer le code d'accès à la planification :"
  );

  if (enteredCode === ACCESS_CODE) {
    // Accès accordé : Enregistre la permission pour la session
    sessionStorage.setItem("planificationAccess", "granted");
    return true;
  } else {
    alert("Code d'accès incorrect. Accès refusé.");
    return false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 2. Vérification du code au chargement de la page
  if (!checkAccessCode()) {
    // Si l'accès est refusé, on masque le contenu et on arrête l'exécution
    const mainContent = document.querySelector(".main-grid");
    if (mainContent) {
      mainContent.innerHTML =
        "<h2>🔒 Accès Restreint</h2><p>Veuillez recharger la page et entrer le code correct.</p>";
    }
    return; // Stoppe l'initialisation du reste du script (la grille ne se charge pas)
  }

  // Le reste de votre code existant DOIT COMMENCER ICI :
  const planificationGrid = document.getElementById("planification-grid");
  const groupHeaderColors = ["blue", "orange", "green", "purple", "red"];
  // ...
  // Le reste de votre code de planification...
  // ...
});

document.addEventListener("DOMContentLoaded", () => {
  const planificationGrid = document.getElementById("planification-grid");
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
  // 0. UTILS & SAUVEGARDE ET CHARGEMENT DES DONNÉES
  // =========================================================

  function createResponsableTag(name) {
    return `<span class="responsable-tag-planif" data-name="${name}">
                    ${name} <span class="remove-resp-planif">×</span>
                </span>`;
  }

  function closeAllPopups() {
    const popups = document.querySelectorAll(".planning-popup");
    if (popups.length > 0) {
      saveData();
      popups.forEach((popup) => popup.remove());
      document.removeEventListener("click", closeAllPopups);
    }
  }

  function collectData() {
    const groups = [];
    planificationGrid
      .querySelectorAll(".group-container")
      .forEach((container) => {
        const tasks = [];

        container.querySelectorAll(".task-row").forEach((row) => {
          const assigneCell = row.querySelector(".assigne");

          tasks.push({
            id: row.getAttribute("data-id"),
            name: row.querySelector(".task-name").textContent,
            status: row.querySelector(".status").getAttribute("data-status"),
            priorite: row
              .querySelector(".priorite")
              .getAttribute("data-priorite"),
            responsables: JSON.parse(
              assigneCell.getAttribute("data-responsables") || "[]"
            ),
            date: row.querySelector(".date-echeance").getAttribute("data-date"),
            description: row.getAttribute("data-description") || "",
          });
        });

        groups.push({
          name: container.getAttribute("data-name"),
          color: container.getAttribute("data-color"),
          tasks: tasks,
        });
      });

    const allData = {
      responsablesList: currentResponsables,
      groups: groups,
      lastId: taskIdCounter,
    };

    return allData;
  }

  function saveData() {
    const data = collectData();
    try {
      localStorage.setItem("planificationData", JSON.stringify(data));
      console.log("Données sauvegardées avec succès.");
    } catch (e) {
      console.error("Erreur lors de la sauvegarde:", e);
    }
  }

  function loadData() {
    try {
      const storedData = localStorage.getItem("planificationData");
      if (storedData) {
        const data = JSON.parse(storedData);

        currentResponsables = data.responsablesList || currentResponsables;
        taskIdCounter = data.lastId || taskIdCounter;

        const initialElements = planificationGrid.querySelectorAll(
          ".group-container, .task-input-row, .group-header-input"
        );
        initialElements.forEach((g) => g.remove());

        data.groups.forEach((groupData) => {
          const newGroupContainer = document.createElement("div");
          newGroupContainer.className = "group-container";
          newGroupContainer.setAttribute("data-name", groupData.name);
          newGroupContainer.setAttribute("data-color", groupData.color);

          newGroupContainer.innerHTML = `
                        <div class="group-header group-header-${groupData.color}">
                            <h3>${groupData.name}</h3>
                        </div>
                    `;
          planificationGrid.appendChild(newGroupContainer);

          groupData.tasks.forEach((taskData) => {
            const row = document.createElement("div");
            row.className = "task-row monday-row";
            row.setAttribute("draggable", "true");
            row.setAttribute("data-id", taskData.id);
            row.setAttribute("data-description", taskData.description || "");

            // ATTENTION: Ajout de tabindex="-1" pour supprimer le focus
            row.innerHTML = `
                            <div class="task-name" contenteditable="true">${
                              taskData.name
                            }</div>
                            <div class="status status-${taskData.status
                              .toLowerCase()
                              .replace(" ", "-")}" data-status="${
              taskData.status
            }" tabindex="-1">${taskData.status}</div>
                            <div class="assigne clickable-field" data-responsables='${JSON.stringify(
                              taskData.responsables
                            )}'></div>
                            <div class="date-echeance clickable-field" data-date="${
                              taskData.date || ""
                            }"></div>
                            <div class="priorite priorite-${taskData.priorite.toLowerCase()}" data-priorite="${
              taskData.priorite
            }" tabindex="-1">${taskData.priorite}</div>
                            <div class="task-description-icon" title="Ajouter/Modifier la description">📝</div>
                        `;

            newGroupContainer.appendChild(row);

            const assigneCell = row.querySelector(".assigne");
            const dateCell = row.querySelector(".date-echeance");
            renderResponsables(assigneCell, taskData.responsables);
            renderDate(dateCell, taskData.date);
            setupTaskInteractivity(row);
          });

          setupGroupEditing(
            newGroupContainer.querySelector(".group-header"),
            newGroupContainer
          );
        });

        return true;
      }
    } catch (e) {
      console.error(
        "Erreur CRITIQUE lors du chargement ou de l'analyse des données locales:",
        e
      );
      localStorage.removeItem("planificationData");
    }
    return false;
  }

  // =========================================================
  // 1. GESTION DES GROUPES (Catégories)
  // =========================================================

  function updateGroupDisplay(container) {
    const name = container.getAttribute("data-name");
    const color = container.getAttribute("data-color");
    const header = container.querySelector(".group-header");

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

        popup
          .querySelectorAll(".btn-color-select")
          .forEach((b) => (b.style.borderColor = "transparent"));
        e.currentTarget.style.borderColor = "#333";
      });
    });

    popup.querySelector(".btn-save-group").addEventListener("click", () => {
      const newName = popup
        .querySelector(".input-group-name-edit")
        .value.trim();
      container.setAttribute("data-name", newName);
      updateGroupDisplay(container);
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

  function createNewTaskRow() {
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

  function createNewTaskInputRow() {
    const inputRow = document.createElement("div");
    inputRow.className = "task-input-row monday-row";

    // Correction de l'innerHTML pour éviter le TypeError
    inputRow.innerHTML = `
            <div style="grid-column: 1 / 6; text-align: center;">
                <button id="btn-add-new-task" class="btn-action-save" style="width: 100%; border-radius: 0;">➕ Ajouter une tâche</button>
            </div>
        `;

    inputRow
      .querySelector("#btn-add-new-task")
      .addEventListener("click", () => {
        const newTask = createNewTaskRow();

        // Logique corrigée pour trouver le dernier groupe, même si nouvellement créé
        const groupContainers =
          planificationGrid.querySelectorAll(".group-container");
        const lastGroup = groupContainers[groupContainers.length - 1];

        if (lastGroup) {
          lastGroup.appendChild(newTask);
        } else {
          const inputTaskRow =
            planificationGrid.querySelector(".task-input-row");
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
    row.querySelectorAll(".task-name").forEach((cell) => {
      cell.addEventListener("blur", () => {
        saveData();
      });
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
    const currentNames = JSON.parse(
      cell.getAttribute("data-responsables") || "[]"
    );

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
        cell.setAttribute(
          "data-responsables",
          JSON.stringify(newSelectedNames)
        );
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
          const firstTask = container.querySelector(".task-row");
          if (firstTask) {
            insertPlaceholder(firstTask, mouseY, true);
          } else {
            const placeholder = document.createElement("div");
            placeholder.className = "drag-placeholder";
            container.appendChild(placeholder);
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
        const target = e.target.closest(".group-header");
        if (target) {
          target.closest(".group-container").appendChild(draggedElement);
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

  // --- EXECUTION AU CHARGEMENT ---

  const dataLoaded = loadData();

  if (!dataLoaded) {
    planificationGrid
      .querySelectorAll(".group-container")
      .forEach((container) => {
        setupGroupEditing(container.querySelector(".group-header"), container);

        container.querySelectorAll(".task-row").forEach((row) => {
          const assigneCell = row.querySelector(".assigne");
          const dateCell = row.querySelector(".date-echeance");

          const initialNames = assigneCell.getAttribute("data-responsables");
          renderResponsables(
            assigneCell,
            initialNames ? JSON.parse(initialNames) : []
          );

          const initialDate = dateCell.getAttribute("data-date");
          renderDate(dateCell, initialDate);

          setupTaskInteractivity(row);
        });
      });
  }

  appendNewTaskAndGroupInputRows();
  setupDragAndDrop();

  if (!dataLoaded) {
    saveData();
  }

  console.log(
    "Planification Monday-like initialisée et pleinement fonctionnelle."
  );
});
