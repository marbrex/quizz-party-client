/* globals renderQuizzes renderUserBtn */

// //////////////////////////////////////////////////////////////////////////////
// LE MODELE, a.k.a, ETAT GLOBAL
// //////////////////////////////////////////////////////////////////////////////

// un objet global pour encapsuler l'état de l'application
// on pourrait le stocker dans le LocalStorage par exemple
var state = {
  // la clef de l'utilisateur
  xApiKey: '',

  // l'URL du serveur où accéder aux données
  serverUrl: 'https://eldark.net/quizparty',

  // la liste des quizzes
  quizzes: [],

  // le quizz actuellement choisi
  currentQuizz: undefined,
};

// une méthode pour l'objet 'state' qui va générer les headers pour les appel à fetch
const headers = new Headers();
headers.set('X-API-KEY', state.xApiKey);
headers.set('Accept', 'application/json');
headers.set('Content-Type', 'application/json');
state.headers = headers;

// //////////////////////////////////////////////////////////////////////////////
// OUTILS génériques
// //////////////////////////////////////////////////////////////////////////////

// un filtre simple pour récupérer les réponses HTTP qui correspondent à des
// erreurs client (4xx) ou serveur (5xx)
// eslint-disable-next-line no-unused-vars
function filterHttpResponse(response) {
  return response
    .json()
    .then((data) => {
      if (response.status >= 400 && response.status < 600) {
        throw new Error(`${data.name}: ${data.message}`);
      }
      return data;
    })
    .catch((err) => console.error(`Error on json: ${err}`));
}

// //////////////////////////////////////////////////////////////////////////////
// DONNEES DES UTILISATEURS
// //////////////////////////////////////////////////////////////////////////////

// mise-à-jour asynchrone de l'état avec les informations de l'utilisateur
// l'utilisateur est identifié via sa clef X-API-KEY lue dans l'état
// eslint-disable-next-line no-unused-vars
const getUser = () => {
  console.debug(`@getUser()`);
  const url = `${state.serverUrl}/users/whoami`;
  return fetch(url, { method: 'GET', headers: state.headers })
    .then(filterHttpResponse)
    .then((data) => {
      // /!\ ICI L'ETAT EST MODIFIE /!\
      state.user = data;
      // on lance le rendu du bouton de login
      return renderUserBtn();
    });
};

// //////////////////////////////////////////////////////////////////////////////
// DONNEES DES QUIZZES
// //////////////////////////////////////////////////////////////////////////////

// mise-à-jour asynchrone de l'état avec les informations de l'utilisateur
// getQuizzes télécharge la page 'p' des quizzes et la met dans l'état
// puis relance le rendu
// eslint-disable-next-line no-unused-vars
const getQuizzes = (p = 1, pl = 50, sort = "quiz_id", order = "asc") => {
  console.debug(`@getQuizzes(${p})`);
  const url = `${state.serverUrl}/quizzes/?page=${p}&limit=${pl}&order=${sort}&dir=${order}`;

  // le téléchargement est asynchrone, là màj de l'état et le rendu se fait dans le '.then'
  return fetch(url, { method: 'GET', headers: state.headers })
    .then(filterHttpResponse)
    .then((data) => {
      // /!\ ICI L'ETAT EST MODIFIE /!\
      state.quizzes = data;

      // Si apres avoir modifie le nombre des quizzes par page
      // on a une liste vide des quizzes
      // (ex. si pageLimit = 5 et la page actulle est la derniere,
      // apres on met pageLimit = 50, alors
      // on aura beaucoup plus moins de pages apres la mise a jour des quizzes
      // et cette page sur la-quelle on etait avant la maj sera vide dans
      // le nouvel objet 'quizzes' retourne par le serveur, car
      // page precedente > derniere page actuelle)
      if (state.quizzes.results.length === 0) {
        getQuizzes(1, pl, sort, order);
      }

      // on a mis à jour les donnés, on peut relancer le rendu
      // eslint-disable-next-line no-use-before-define
      return renderQuizzes();
    });
};

const getMyQuizzes = () => {
  console.debug(`@getMyQuizzes()`);
  const url = `${state.serverUrl}/users/quizzes`;

  // le téléchargement est asynchrone, là màj de l'état et le rendu se fait dans le '.then'
  return fetch(url, { method: 'GET', headers: state.headers })
    .then(filterHttpResponse)
    .then((data) => {
        // /!\ ICI L'ETAT EST MODIFIE /!\
        state.myQuizzes = data;
        console.log("@getMyQuizzes() => My quizzes : ");
        console.log(state.myQuizzes);

        // on a mis à jour les donnés, on peut relancer le rendu
        // eslint-disable-next-line no-use-before-define
        return renderMyQuizzes();
    });
};

const postQuiz = (quiz_title, quiz_descr) => {
  console.debug(`@postQuiz(${quiz_title}, ${quiz_descr})`);
  const url = `${state.serverUrl}/quizzes/`;

  let p = new Promise((resolve, reject) => {
    if (quiz_title === '' || !quiz_title || !quiz_title.replace(/\s/g, '').length) {
      M.toast({
        html: 'Title is empty !',
        displayLength: 4000,
        classes: 'error'
      });
      throw new Error(`Title is empty !`);
      reject(`Title is empty !`);
    }
    if (quiz_descr === '' || !quiz_descr || !quiz_descr.replace(/\s/g, '').length) {
      M.toast({
        html: 'Description is empty !',
        displayLength: 4000,
        classes: 'error'
      });
      throw new Error(`Description is empty !`);
      reject(`Description is empty !`);
    }
    resolve();
  })
  .then(() => {
    let configObj = {
      method: 'POST',
      headers: state.headers,
      body: JSON.stringify({
        title: quiz_title,
        description: quiz_descr
      })
    };

    return fetch(url, configObj)
    .then(filterHttpResponse)
    .then((data) => {
      console.log(`@postQuiz(${quiz_title}, ${quiz_descr}) => Data :`);
      console.log(data);

      // To update list of user's quizzes
      getMyQuizzes();

      M.toast({
        html: 'Quiz created !',
        displayLength: 4000,
        classes: 'success'
      });

      let elem = document.getElementById('modal-create-quiz');
      let inst = M.Modal.getInstance(elem);
      inst.close();

      document.querySelector('#modal-create-quiz #quiz-title').value = '';
      document.querySelector('#modal-create-quiz #quiz-descr').value = '';

      return data;
    });
  })
  .catch(err => console.error(`Error on creating quiz: ${err}`));
};

const createNewQuiz = (quiz_title, quiz_descr) => {
  if (quiz_title === undefined)
    quiz_title = document.querySelector('#modal-create-quiz #quiz-title').value;
  if (quiz_descr === undefined)
    quiz_descr = document.querySelector('#modal-create-quiz #quiz-descr').value;

  postQuiz(quiz_title, quiz_descr);
};

const getOneQuiz = (quizId) => {
  console.debug(`@getOneQuiz(${quizId})`);
  const url = `${state.serverUrl}/quizzes/${quizId}/`;

  return fetch(url, { method: 'GET', headers: state.headers })
    .then(filterHttpResponse)
    .then((data) => {
      console.log(`@getOneQuiz(${quizId}) => Data :`);
      console.log(data);

      return data;
    });
};

const deleteQuiz = (quizId) => {
  console.debug(`@deleteQuiz(${quizId})`);
  const url = `${state.serverUrl}/quizzes/${quizId}/`;

  return fetch(url, { method: 'DELETE', headers: state.headers })
    .then(filterHttpResponse)
    .then((data) => {
      console.log(`@deleteQuiz(${quizId}) => Data :`);
      console.log(data);

      getMyQuizzes();

      return data;
    });
};

const updateQuiz = (quiz_id) => {
  let quiz_title = document.getElementById('input-change-quiz-title').value;
  let quiz_descr = document.getElementById('input-change-quiz-description').value;
  let quiz_open = document.getElementById('input-change-quiz-open').checked;

  console.debug(`@updateQuiz(${quiz_id})`);
  const url = `${state.serverUrl}/quizzes/${quiz_id}`;

  let bodyObj = {
    title: quiz_title,
    description: quiz_descr,
    open: quiz_open
  };

  let p = new Promise((resolve, reject) => {
    if (bodyObj.title === '' || !bodyObj.title || !bodyObj.title.replace(/\s/g, '').length) {
      M.toast({
        html: 'Title is empty !',
        displayLength: 4000,
        classes: 'error'
      });
      throw new Error(`Title is empty !`);
      reject(`Title is empty !`);
    }
    if (bodyObj.description === '' || !bodyObj.description || !bodyObj.description.replace(/\s/g, '').length) {
      M.toast({
        html: 'Description is empty !',
        displayLength: 4000,
        classes: 'error'
      });
      throw new Error(`Description is empty !`);
      reject(`Description is empty !`);
    }
    resolve();
  })
  .then(() => {
    let configObj = {
      method: 'PUT',
      headers: state.headers,
      body: JSON.stringify(bodyObj)
    };

    return fetch(url, configObj)
      .then(filterHttpResponse)
      .then((data) => {
        console.log(`@updateQuiz(${quiz_id}) => Data :`);
        console.log(data);

        // To update
        getMyQuizzes();
        getMyQuestions(quiz_id);

        M.toast({
          html: 'Quiz updated !',
          displayLength: 4000,
          classes: 'success'
        });

        let elem = document.getElementById('modal-template');
        let inst = M.Modal.getInstance(elem);
        inst.close();

        return data;
      });
  })
  .catch((err) => console.error(`Error on quiz updating: ${err}`));
};

// //////////////////////////////////////////////////////////////////////////////
// DONNEES DES QUESTIONS
// //////////////////////////////////////////////////////////////////////////////

const getQuestions = (quizId) => {
  console.debug(`@getQuestions(${quizId})`);
  const url = `${state.serverUrl}/quizzes/${state.currentQuizz}/questions/`;

  return fetch(url, { method: 'GET', headers: state.headers })
    .then(filterHttpResponse)
    .then((data) => {
      state.questions = data;

      // console.log(state.questions);
      return renderCurrentQuizz();
    });
};

const getMyQuestions = (quizId) => {
  console.debug(`@getMyQuestions(${quizId})`);
  const url = `${state.serverUrl}/quizzes/${quizId}/questions/`;

  return fetch(url, { method: 'GET', headers: state.headers })
    .then(filterHttpResponse)
    .then((data) => {
      state.myCurrentQuiz = quizId;
      state.myQuestions = data;

      // console.log(state.questions);
      return renderMyCurrentQuiz();
    });
};

const deleteQuestion = (quizId, qstnId) => {
  console.debug(`@deleteQuestion(${quizId})`);
  const url = `${state.serverUrl}/quizzes/${quizId}/questions/${qstnId}`;

  return fetch(url, { method: 'DELETE', headers: state.headers })
    .then(filterHttpResponse)
    .then((data) => {
      console.log(`@deleteQuestion(${quizId}) => Data :`);
      console.log(data);

      getMyQuestions(quizId);

      return data;
    });
};

const postQuestion = (quiz_id) => {
  console.debug(`@postQuestion(${quiz_id})`);

  // On a besoin d'information du quiz associe,
  // pour recuperer le nombre des questions (Array.length)
  // que l'on va utiliser comme ID pour prochaine question
  let quiz = getOneQuiz(quiz_id);

  // Apres qu'on a recupere le quiz
  quiz.then((quiz) => {
    console.log(`@postQuestion(${quiz_id}) => Quiz :`);
    console.log(quiz);

    // ID de question a ajouter
    let qstn_id = quiz.questions_number;

    // On regarde s'il existe une question
    // avec ID = qstn_id
    while (quiz.questions_ids.includes(qstn_id)) {
      qstn_id++;
    }

    console.log(`@postQuestion(${quiz_id}) => Qstn Id : ${qstn_id}`);

    return qstn_id;
  })

  .then((qstn_id) => {
    // "sentence" de la question a ajouter
    let qstn = document.getElementById('input-question').value;
    console.log(`@postQuestion(${quiz_id}) => Question : "${qstn}"`);

    // Propositions de la question a ajouter
    let qstn_props = state.propObjArr;
    console.log(`@postQuestion(${quiz_id}) => Propositions :`);
    console.log(qstn_props);

    // On stocke tous les informations dans un objet
    // pour pouvoir passer les donnees a la prochaine promesse
    let bodyObj = {
      question_id: qstn_id,
      sentence: qstn,
      propositions: qstn_props
    };

    // ===== GESTION DES ERREURS =====

    // "sentence" est vide ou contient que des espaces
    if (bodyObj.sentence === '' || !bodyObj.sentence || !bodyObj.sentence.replace(/\s/g, '').length) {
      M.toast({
        html: 'Question is empty !',
        displayLength: 4000,
        classes: 'error'
      });
      throw new Error(`Question is empty !`);
    }

    // Nombre de Propositions est < 2
    if (!bodyObj.propositions || bodyObj.propositions.length < 2) {
      M.toast({
        html: 'Give at least 2 propositions !',
        displayLength: 4000,
        classes: 'error'
      });
      throw new Error(`Give at least 2 propositions !`);
    }

    // On recupere la bonne reponse a la question
    let checkedProp = document.querySelector('input[name=add-qstn-modal-prop-correct]:checked');
    // Si OK
    if (checkedProp && checkedProp !== null) {
      let checkedPropId = Number(checkedProp.id.split('-')[2]);
      bodyObj.propositions.map((prop) => {
        if (prop.proposition_id === checkedPropId) {
          prop.correct = true;
        } else {
          prop.correct = false;
        }
      });
    } else {
      // Si la bonne reponse n'est pas choisie
      M.toast({
        html: 'Give correct proposition !',
        displayLength: 4000,
        classes: 'error'
      });
      throw new Error(`Give correct proposition !`);
    }

    return bodyObj;
  })

  .then((bodyObj) => {
    // ===== Tout est bien passe =====
    // (On a des donnees correctes
    // et on peut les envoyer au serveur)

    const url = `${state.serverUrl}/quizzes/${quiz_id}/questions`;

    let configObj = {
      method: 'POST',
      headers: state.headers,
      body: JSON.stringify(bodyObj)
    };

    // On envoie une requete au serveur
    return fetch(url, configObj)
      .then(filterHttpResponse)
      .then((data) => {
        console.log(`@postQuestion(${quiz_id}) => Data :`);
        console.log(data);

        // To update
        getMyQuestions(quiz_id);

        // Message de succes
        M.toast({
          html: 'Question created !',
          displayLength: 4000,
          classes: 'success'
        });

        // On ferme la fenetre modal a la main
        // (car on a specifie Modal.onCloseEnd)
        let elem = document.getElementById('modal-template');
        let inst = M.Modal.getInstance(elem);
        inst.close();

        return data;
      });
  })
  // On affiche le message d'erreur dans la console
  .catch(err => console.error(`Error on question posting: ${err}`));
};

const updateQuestion = (quiz_id, qstn_id) => {
  console.debug(`@updateQuestion(${quiz_id}, ${qstn_id})`);

  let qstn = document.getElementById('input-question').value;
  console.log(`@updateQuestion(${quiz_id}, ${qstn_id}) => Question : "${qstn}"`);

  // On cree une promesse pour avoir l'execution du code par ordre,
  // pour etre sur qu'on a d'abord recupere tous les donnees
  // et APRES on gere les erreurs
  // et APRES si tout se passe bien on pourra envoyer une requete au serveur
  let p = new Promise((resolve, reject) => {
    // let qstn_props = new Array;
    state.propObjArr.map(prop => {
      // qstn_props.push({
      //   content: document.getElementById(`prop-content-id-${prop.proposition_id}`).value,
      //   proposition_id: prop.proposition_id,
      //   correct: false
      // });
      prop.content = document.getElementById(`prop-content-id-${prop.proposition_id}`).value;
    });

    console.log(`@updateQuestion(${quiz_id}, ${qstn_id}) => Propositions :`);
    console.log(state.propObjArr);

    let qstnObj = {
      sentence: qstn,
      propositions: state.propObjArr
    };

    resolve(qstnObj);
  })

  .then(qstnObj => {
    // ===== GESTION DES ERREURS =====

    // "sentence" est vide ou contient que des espaces
    if (qstnObj.sentence === '' || !qstnObj.sentence || !qstnObj.sentence.replace(/\s/g, '').length) {
      M.toast({
        html: 'Question is empty !',
        displayLength: 4000,
        classes: 'error'
      });
      throw new Error(`Question is empty !`);
    }

    // Si une des propositions est vide ou contient que des espaces
    qstnObj.propositions.map((prop, index) => {
      if (prop.content === '' || !prop.content || !prop.content.replace(/\s/g, '').length) {
        M.toast({
          html: `Proposition ${index+1} is empty !`,
          displayLength: 4000,
          classes: 'error'
        });
        throw new Error(`Proposition ${index+1} is empty !`);
      }
    });

    // On recupere la bonne reponse a la question
    let checkedProp = document.querySelector('input[name=add-qstn-modal-prop-correct]:checked');
    // Si OK
    if (checkedProp && checkedProp !== null) {
      let checkedPropId = Number(checkedProp.id.split('-')[2]);
      qstnObj.propositions.map((prop) => {
        if (prop.proposition_id === checkedPropId) {
          prop.correct = true;
        }
      });
    } else {
      // Si la bonne reponse n'est pas choisie
      M.toast({
        html: 'Give correct proposition !',
        displayLength: 4000,
        classes: 'error'
      });
      throw new Error(`Give correct proposition !`);
    }

    return qstnObj;
  })

  .then(qstnObj => {
    // ===== Tout est bien passe =====
    // (On a des donnees correctes,
    // on peut envoyer les donnees au serveur)

    const url = `${state.serverUrl}/quizzes/${quiz_id}/questions/${qstn_id}`;

    let configObj = {
      method: 'PUT',
      headers: state.headers,
      body: JSON.stringify(qstnObj)
    };

    // On envoie une requete au serveur
    return fetch(url, configObj)
      .then(filterHttpResponse)
      .then((data) => {
        console.log(`@updateQuestion(${quiz_id}, ${qstn_id}) => Data :`);
        console.log(data);

        // To update
        getMyQuestions(quiz_id);

        // Message de succes
        M.toast({
          html: 'Question updated !',
          displayLength: 4000,
          classes: 'success'
        });

        // On ferme la fenetre modal a la main
        // (car on a specifie Modal.onCloseEnd)
        let elem = document.getElementById('modal-template');
        let inst = M.Modal.getInstance(elem);
        inst.close();

        return data;
      });
  })
  .catch(err => console.error(`Error on question updating: ${err}`));
};

// //////////////////////////////////////////////////////////////////////////////
// DONNEES DES REPONSES
// //////////////////////////////////////////////////////////////////////////////

// Fonction qui envoie la requete 'GET mes reponses' au serveur
const getMyAnswers = () => {
  console.debug(`@getMyAnswers()`);
  const url = `${state.serverUrl}/users/answers`;

  // le téléchargement est asynchrone, là màj de l'état et le rendu se fait dans le '.then'
  return fetch(url, { method: 'GET', headers: state.headers })
    .then(filterHttpResponse)
    .then((data) => {
        // /!\ ICI L'ETAT EST MODIFIE /!\
        state.myAnswers = data;
        console.log("@getMyAnswers() => My answers : ");
        console.log(state.myAnswers);

        // on a mis à jour les donnés, on peut relancer le rendu
        // eslint-disable-next-line no-use-before-define
        return renderMyAnswers();
    });
};

// Fonction qui envoie la requete 'POST reponses' au serveur
const postAnswers = (quiz_id, qstn_id, prop_id) => {
  console.debug(`@postAnswers(${quiz_id}, ${qstn_id}, ${prop_id})`);
  const url = `${state.serverUrl}/quizzes/${quiz_id}/questions/${qstn_id}/answers/${prop_id}`;

  let configObj = {
    method: 'POST',
    headers: state.headers
  };

  return fetch(url, configObj)
  .then(resp => {
    resp.json();
    return resp;
  })
  .then((resp) => {
    console.log(`@postAnswers(${quiz_id}, ${qstn_id}, ${prop_id}) => Response :`);
    console.log(resp);
    return resp;
  });
};

document.getElementById("search-form").onsubmit = () => {
  console.debug(`@search()`);
  alert(document.querySelector('input#search').value);
};
