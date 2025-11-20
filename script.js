/*
 * Fichier JavaScript pour les fonctions interactives du projet Arthro-IMC
 */

// =========================================================
// 1. CALCULATEUR D'IMC
// =========================================================

function calculerIMC() {
  const poidsStr = document.getElementById("poids").value;
  const tailleStr = document.getElementById("taille").value;

  const poids = parseFloat(poidsStr);
  const taille = parseFloat(tailleStr);

  const resultatDiv = document.getElementById("resultat-imc");

  if (isNaN(poids) || isNaN(taille) || poids <= 0 || taille <= 0) {
    resultatDiv.innerHTML =
      "Veuillez entrer des valeurs numériques valides pour la taille (en mètres) et le poids (en kg).";
    resultatDiv.className = "imc-error";
    return;
  }

  const imc = poids / (taille * taille);
  const imcArrondi = imc.toFixed(2);

  let classification = "";
  let couleur = "";

  if (imc < 18.5) {
    classification = "Insuffisance pondérale (Maigreur)";
    couleur = "imc-underweight";
  } else if (imc >= 18.5 && imc <= 24.9) {
    classification = "Poids normal";
    couleur = "imc-normal";
  } else if (imc >= 25.0 && imc <= 29.9) {
    classification = "Surpoids";
    couleur = "imc-overweight";
  } else {
    classification = "Obésité (Classe I, II, ou III)";
    couleur = "imc-obese";
  }

  resultatDiv.innerHTML = `
        <h3>Votre Indice de Masse Corporelle (IMC) :</h3>
        <p><strong>IMC : ${imcArrondi} kg/m²</strong></p>
        <p>Classification : ${classification}</p>
        <small>Ceci est un calcul standard de l'IMC.</small>
    `;
  resultatDiv.className = "imc-result " + couleur;
}

// =========================================================
// 2. GESTION DES TÂCHES (TO DO LIST)
// =========================================================

const assignesPossibles = ["Nathan", "Hugo", "Jérémy", "Lucas", "Groupe"];
const statutsPossibles = ["Non commencé", "En cours", "Terminé"];
const couleursCadrePossibles = ["Blanc", "Jaune", "Orange", "Vert"];

let taches = [
  {
    id: 1,
    texte: "Relire et valider l'introduction de l'État de l'Art.",
    description:
      "Vérifier la cohérence avec les objectifs finaux et les sources primaires.",
    type: "Date limite",
    dateLimite: "2025-11-20",
    responsables: ["Nathan", "Hugo"],
    statut: "Terminé",
    couleurCadre: "Vert", // NOUVELLE PROPRIÉTÉ
    modeEdit: false,
  },
  {
    id: 2,
    texte: "Exécuter l'ANOVA pour les données de force MVC.",
    description:
      "Comparer les groupes LBM faible vs élevé. Vérifier la normalité des résidus.",
    type: "Autre",
    dateLimite: "",
    responsables: ["Lucas"],
    statut: "En cours",
    couleurCadre: "Jaune", // NOUVELLE PROPRIÉTÉ
    modeEdit: false,
  },
  {
    id: 3,
    texte: "Rendez-vous avec Patrick Chabrand.",
    description:
      "Discuter des prothèses de genoux et de l'approche par éléments finis.",
    type: "RDV",
    dateLimite: "2025-11-25",
    responsables: ["Jérémy", "Groupe"],
    statut: "Non commencé",
    couleurCadre: "Orange", // NOUVELLE PROPRIÉTÉ
    modeEdit: false,
  },
];
let nextId = 4;

// État temporaire pour l'ajout de tâche
let responsablesSelectionnesAjout = [];

/**
 * Gère l'ajout/retrait d'un responsable via la liste déroulante lors de l'ajout (multi-sélection).
 */
function gererResponsableSelection(selectElement) {
  const responsable = selectElement.value;

  if (responsable) {
    const index = responsablesSelectionnesAjout.indexOf(responsable);
    if (index === -1) {
      responsablesSelectionnesAjout.push(responsable);
    } else {
      responsablesSelectionnesAjout.splice(index, 1);
    }

    selectElement.selectedIndex = 0;
  }

  afficherTagsResponsables(
    responsablesSelectionnesAjout,
    "responsables-selectionnes-ajout",
    true
  );
}

/**
 * Affiche les tags des responsables (boutons de désélection). (Fonction inchangée)
 */
function afficherTagsResponsables(
  responsables,
  containerId,
  isAddMode,
  taskId = null
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (responsables.length === 0) {
    container.innerHTML =
      '<span class="instruction-selection">Aucune personne assignée.</span>';
    if (isAddMode) return;
  }

  const sortedResponsables = responsables.sort();

  sortedResponsables.forEach((resp) => {
    const tag = document.createElement("span");
    tag.classList.add("tag-responsable-bouton");
    tag.textContent = resp;

    const removeButton = document.createElement("span");
    removeButton.classList.add("remove-resp");
    removeButton.textContent = "×";

    removeButton.onclick = () => {
      if (isAddMode) {
        responsablesSelectionnesAjout = responsablesSelectionnesAjout.filter(
          (r) => r !== resp
        );
        afficherTagsResponsables(
          responsablesSelectionnesAjout,
          containerId,
          true
        );
      } else {
        const tache = taches.find((t) => t.id === taskId);
        if (tache) {
          tache.responsables = tache.responsables.filter((r) => r !== resp);
          afficherTagsResponsables(
            tache.responsables,
            containerId,
            false,
            taskId
          );

          const select = document.getElementById(
            `select-responsable-edit-${taskId}`
          );
          if (select) {
            Array.from(select.options).forEach((option) => {
              if (option.value === resp) {
                option.disabled = false;
              }
            });
          }
        }
      }
    };

    tag.appendChild(removeButton);
    container.appendChild(tag);
  });
}

/**
 * Change la couleur du cadre de la tâche (Nouvelle fonction)
 */
function changerCouleurCadre(id, nouvelleCouleur) {
  const tache = taches.find((t) => t.id === id);
  if (tache) {
    tache.couleurCadre = nouvelleCouleur;

    // Mettre à jour l'état "actif" des boutons de couleur (UX)
    const liElement = document.querySelector(`li[data-id="${id}"]`);
    if (liElement) {
      const allBtns = liElement.querySelectorAll(".btn-couleur");
      allBtns.forEach((btn) => btn.classList.remove("active"));
      const activeBtn = liElement.querySelector(
        `.btn-couleur-${nouvelleCouleur}`
      );
      if (activeBtn) activeBtn.classList.add("active");

      // Changer la classe de couleur sur le LI (frame)
      couleursCadrePossibles
        .map((c) => `couleur-${c}`)
        .forEach((cls) => liElement.classList.remove(cls));
      liElement.classList.add(`couleur-${nouvelleCouleur}`);
    }
  }
}

/**
 * Change le statut d'une tâche (MAJ : NE TOUCHE PLUS À LA COULEUR DU CADRE)
 */
function changerStatut(id, nouveauStatut) {
  const tache = taches.find((t) => t.id === id);
  if (tache) {
    tache.statut = nouveauStatut;

    // Mise à jour de l'état "actif" des boutons (UX)
    const liElement = document.querySelector(`li[data-id="${id}"]`);
    if (liElement) {
      const allBtns = liElement.querySelectorAll(".btn-statut");
      allBtns.forEach((btn) => btn.classList.remove("active"));
      const activeBtn = liElement.querySelector(
        `.btn-${nouveauStatut.replace(/\s/g, "-").toLowerCase()}`
      );
      if (activeBtn) activeBtn.classList.add("active");
    }
  }
}

/**
 * Affiche la liste des tâches.
 */
function afficherTaches() {
  const listeElement = document.getElementById("liste-des-taches");
  if (!listeElement) return;

  listeElement.innerHTML = "";

  taches.forEach((tache) => {
    const li = document.createElement("li");
    li.setAttribute("data-id", tache.id);
    li.classList.add("todo-item");

    // Utilise la nouvelle propriété couleurCadre pour la classe de couleur de fond
    li.classList.add(`couleur-${tache.couleurCadre}`);

    const responsablesText = tache.responsables.join(", ");
    const dateLabel = tache.type + ": ";
    const dateDisplay = tache.dateLimite
      ? new Date(tache.dateLimite).toLocaleDateString("fr-FR")
      : "Non définie";

    let contentHTML = "";

    // --- Contenu Mode Modification ---
    if (tache.modeEdit) {
      contentHTML = `
                <div class="task-info task-edit-mode">
                    
                    <div class="edit-group edit-line-1">
                        <label class="edit-label">Couleur du Cadre:</label>
                        ${couleursCadrePossibles
                          .map(
                            (couleur) => `
                            <button onclick="changerCouleurCadre(${
                              tache.id
                            }, '${couleur}')" 
                                    class="btn-couleur btn-couleur-${couleur} ${
                              tache.couleurCadre === couleur ? "active" : ""
                            }">
                                ${couleur}
                            </button>
                        `
                          )
                          .join("")}
                    </div>

                    <div class="edit-group edit-line-1">
                        <label class="edit-label">Statut d'avancement:</label>
                        <button onclick="changerStatut(${
                          tache.id
                        }, 'Non commencé')" class="btn-statut btn-non-commence ${
        tache.statut === "Non commencé" ? "active" : ""
      }">Non commencé</button>
                        <button onclick="changerStatut(${
                          tache.id
                        }, 'En cours')" class="btn-statut btn-en-cours ${
        tache.statut === "En cours" ? "active" : ""
      }">En cours</button>
                        <button onclick="changerStatut(${
                          tache.id
                        }, 'Terminé')" class="btn-statut btn-termine ${
        tache.statut === "Terminé" ? "active" : ""
      }">Terminé</button>
                    </div>

                    <label class="edit-label full-width">Tâche Principale</label>
                    <input type="text" id="edit-texte-${tache.id}" value="${
        tache.texte
      }" class="input-modifier-tache input-modifier-main full-width">
                    
                    <label class="edit-label full-width">Description Détaillée</label>
                    <textarea id="edit-description-${
                      tache.id
                    }" class="input-modifier-tache input-modifier-desc full-width">${
        tache.description || ""
      }</textarea>
                    
                    <div class="edit-group edit-line-2">
                        <div class="edit-field">
                             <label class="edit-label">Type d'événement</label>
                            <select id="edit-type-${
                              tache.id
                            }" class="select-tache-edit">
                                <option value="Date limite" ${
                                  tache.type === "Date limite" ? "selected" : ""
                                }>Date limite</option>
                                <option value="RDV" ${
                                  tache.type === "RDV" ? "selected" : ""
                                }>RDV</option>
                                <option value="Autre" ${
                                  tache.type === "Autre" ? "selected" : ""
                                }>Autre</option>
                            </select>
                        </div>
                        <div class="edit-field">
                             <label class="edit-label">Date Limite</label>
                             <input type="date" id="edit-date-${
                               tache.id
                             }" value="${
        tache.dateLimite || ""
      }" class="input-tache-edit">
                        </div>
                    </div>

                    <div class="edit-group edit-line-3">
                        <div class="edit-field full-width">
                            <label class="edit-label">Responsables:</label>
                            <select id="select-responsable-edit-${
                              tache.id
                            }" onchange="ajouterResponsableEdit(${
        tache.id
      }, this.value)">
                                <option value="" disabled selected>Ajouter/Retirer un responsable</option>
                                ${assignesPossibles
                                  .map(
                                    (r) =>
                                      `<option value="${r}" ${
                                        tache.responsables.includes(r)
                                          ? "disabled"
                                          : ""
                                      }>${r}</option>`
                                  )
                                  .join("")}
                            </select>
                            <div id="responsables-edit-${
                              tache.id
                            }" class="responsable-tag-container-edit"></div>
                        </div>
                    </div>
                </div>
                <div class="actions actions-edit">
                    <button onclick="sauvegarderTache(${
                      tache.id
                    })" class="btn-action-save" title="Sauvegarder">
                        Sauvegarder
                    </button>
                    <button onclick="toggleEditMode(${
                      tache.id
                    })" class="btn-action-cancel" title="Annuler">
                        Annuler
                    </button>
                </div>
            `;
      setTimeout(() => {
        afficherTagsResponsables(
          tache.responsables,
          `responsables-edit-${tache.id}`,
          false,
          tache.id
        );
      }, 0);
    } else {
      // --- Contenu Mode Affichage (par défaut) ---
      contentHTML = `
                <div class="task-info">
                    <div class="task-metadata">
                        <span class="task-status-display status-${tache.statut.replace(
                          /\s/g,
                          ""
                        )}">${tache.statut}</span>
                        <span class="type-tag tag-${tache.type.replace(
                          /\s/g,
                          ""
                        )}">${tache.type}</span>
                        <span class="responsable-tag">${
                          responsablesText || "Non assigné"
                        }</span>
                        
                        <span class="date-tag tag-date tag-${tache.type.replace(
                          /\s/g,
                          ""
                        )}">${dateLabel}${dateDisplay}</span>
                    </div>
                    <div class="task-text-container" onclick="toggleDescription(${
                      tache.id
                    }, this)">
                        <span class="task-text">${tache.texte}</span>
                        <span class="task-description" id="description-${
                          tache.id
                        }">${
        tache.description || "Pas de description détaillée."
      }</span>
                    </div>
                </div>
                <div class="actions">
                    <button onclick="toggleEditMode(${
                      tache.id
                    })" class="btn-action-edit" title="Modifier la tâche">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7.5 19.5l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button onclick="supprimerTache(${
                      tache.id
                    })" class="btn-action-delete" title="Supprimer la tâche">
                        &times;
                    </button>
                </div>
            `;
    }

    li.innerHTML = contentHTML;
    listeElement.appendChild(li);
  });
}

/**
 * Affiche/Cache la description détaillée d'une tâche au clic sur le texte principal. (Fonction inchangée)
 */
function toggleDescription(id, container) {
  const tache = taches.find((t) => t.id === id);
  if (tache && tache.modeEdit) return;

  const descriptionElement = document.getElementById(`description-${id}`);
  if (descriptionElement) {
    descriptionElement.classList.toggle("visible");
    container.classList.toggle("expanded");
  }
}

/**
 * Active/Désactive le mode d'édition pour une tâche spécifique. (Fonction inchangée)
 */
function toggleEditMode(id) {
  const tache = taches.find((t) => t.id === id);
  if (tache) {
    taches.forEach((t) => (t.modeEdit = false));
    tache.modeEdit = !tache.modeEdit;
    afficherTaches();
  }
}

/**
 * Ajoute/retire un responsable en mode édition. (Fonction inchangée)
 */
function ajouterResponsableEdit(id, responsable) {
  const tache = taches.find((t) => t.id === id);
  if (tache && responsable) {
    const index = tache.responsables.indexOf(responsable);
    if (index === -1) {
      tache.responsables.push(responsable);
    } else {
      tache.responsables.splice(index, 1);
    }

    afficherTagsResponsables(
      tache.responsables,
      `responsables-edit-${id}`,
      false,
      id
    );

    const select = document.getElementById(`select-responsable-edit-${id}`);
    if (select) {
      Array.from(select.options).forEach((option) => {
        option.disabled = tache.responsables.includes(option.value);
      });
      select.selectedIndex = 0;
    }
  }
}

/**
 * Sauvegarde les modifications d'une tâche. (Fonction inchangée)
 */
function sauvegarderTache(id) {
  const tache = taches.find((t) => t.id === id);
  if (!tache) return;

  const newTexte = document.getElementById(`edit-texte-${id}`).value.trim();
  const newDescription = document
    .getElementById(`edit-description-${id}`)
    .value.trim();
  const newType = document.getElementById(`edit-type-${id}`).value;
  const newDate = document.getElementById(`edit-date-${id}`).value;

  if (!newTexte) {
    alert("Le texte de la tâche principale ne peut pas être vide.");
    return;
  }

  tache.texte = newTexte;
  tache.description = newDescription;
  tache.type = newType;
  tache.dateLimite = newDate;
  tache.modeEdit = false;

  afficherTaches();
}

/**
 * Ajoute une nouvelle tâche à la liste.
 */
function ajouterTache() {
  const texteInput = document.getElementById("nouvelle-tache-texte");
  const typeSelect = document.getElementById("nouvelle-tache-type");
  const dateInput = document.getElementById("nouvelle-tache-date");

  const texte = texteInput.value.trim();
  const type = typeSelect.value;
  const date = dateInput.value;
  const responsables = responsablesSelectionnesAjout;
  const statut = "Non commencé";
  const couleurCadre = "Blanc"; // Couleur par défaut lors de l'ajout

  if (texte && responsables.length > 0) {
    const nouvelleTache = {
      id: nextId++,
      texte: texte,
      description: "",
      type: type,
      dateLimite: date,
      responsables: responsables,
      statut: statut,
      couleurCadre: couleurCadre,
      modeEdit: false,
    };
    taches.push(nouvelleTache);

    // Réinitialisation de l'interface
    texteInput.value = "";
    typeSelect.value = "Date limite";
    dateInput.value = "";
    responsablesSelectionnesAjout = [];
    document.getElementById("select-responsable-temp").selectedIndex = 0;

    afficherTaches();
    afficherTagsResponsables(
      responsablesSelectionnesAjout,
      "responsables-selectionnes-ajout",
      true
    );
  } else {
    alert(
      "Veuillez entrer une description de tâche principale et assigner au moins une personne."
    );
  }
}

/**
 * Supprime une tâche de la liste par ID. (Fonction inchangée)
 */
function supprimerTache(id) {
  if (confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) {
    taches = taches.filter((tache) => tache.id !== id);
    afficherTaches();
  }
}

// Appel initial lorsque la page est chargée
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("liste-des-taches")) {
    afficherTaches();
  }
  const selectResponsableAjout = document.getElementById(
    "select-responsable-temp"
  );
  if (selectResponsableAjout) {
    selectResponsableAjout.addEventListener("change", () =>
      gererResponsableSelection(selectResponsableAjout)
    );
    afficherTagsResponsables(
      responsablesSelectionnesAjout,
      "responsables-selectionnes-ajout",
      true
    );
  }
});
