export type Language = "it" | "en" | "es" | "sq";
export const languages: Array<{ code: Language; flag: string; label: string }> = [
  { code: "it", flag: "🇮🇹", label: "Italiano" }, { code: "en", flag: "🇬🇧", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" }, { code: "sq", flag: "🇦🇱", label: "Shqip" },
];

const it = {
  install:"Installa l’app",
  how:"Come si gioca", classic:"Il classico dalmata · online", newGame:"Nuova partita", join:"Entra", yourName:"Il tuo nome", namePh:"Come ti chiami?", howMany:"Quante persone giocano?", youBots:"tu + 3 bot", humans:"umani", allHuman:"tutti umani", create:"Crea la stanza", orCode:"oppure entra con un codice", code:"CODICE", noDownload:"Nessun download. Funziona su iPhone, Android e desktop.", edition:"Edizione 2026", footer:"Gioca responsabilmente, passa strategicamente.", exit:"Esci", waiting:"Sala d’attesa", gather:"Raduna il tavolo", stillNeed:"Servono ancora", player:"giocatore", players:"giocatori", botsFill:"Gli altri posti saranno affidati ai bot.", roomCode:"Codice stanza", copied:"Link copiato!", copyInvite:"Copia link d’invito", waitingSeat:"In attesa…", team:"Squadra", amber:"Ambra", jade:"Giada", target:"Traguardo", you:"Tu", cards:"carte", lastCard:"ULTIMA MANO!", place:"posto", yourTurn:"Tocca a te", turnOf:"Turno di", matchOver:"Partita conclusa", handOver:"Mano conclusa", newRound:"Nuovo giro", freePlay:"gioca una combinazione libera", passed:"Hanno passato", yourHand:"La tua mano", selected:"selezionate", selectCards:"Seleziona le carte da giocare", pass:"Passo", play:"Gioca", newHand:"Nuova mano", home:"Torna all’inizio", tableLog:"Diario del tavolo", unexpected:"Errore inatteso.", lobby:"Lobby chat", lobbyTitle:"Lobby Murlan", organize:"Organizza una partita", lobbyEmpty:"La lobby è silenziosa. Rompi il ghiaccio.", enterRoom:"Entra", inviteRoom:"Invita alla stanza", writeLobby:"Scrivi nella lobby…", nameFirst:"Inserisci prima il tuo nome", send:"Invia", notify:"Attiva avvisi per i nuovi inviti", inviteMessage:"Vuoi giocare? Entra nella mia stanza.", notification:"nella lobby Murlan",
  suits:{H:"Cuori",D:"Quadri",C:"Fiori",S:"Picche",X:"Jolly"}, kinds:{single:"Singola",pair:"Coppia",triple:"Tris",straight:"Scala","triple-run":"Scala con tris","five-pairs":"Scala di 5 coppie",bomb:"Bomba","straight-flush":"Scala reale"},
  rulesTitle:"Come si gioca a Murlan", rulesEdition:"Regolamento 2026", rulesIntro:"Liberati di tutte le carte prima degli avversari. I posti opposti formano una squadra: Ambra (1 e 3) contro Giada (2 e 4).", rules:[
    ["Preparazione e obiettivo","Si usa un mazzo francese di 54 carte, inclusi Jolly Nero e Jolly Rosso. Tutte le carte vengono distribuite: due giocatori ricevono 14 carte e due 13. Le posizioni valgono 3, 2, 1 e 0 punti; i punti dei compagni si sommano."],
    ["Ordine e apertura","L’ordine è 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2, Jolly Nero, Jolly Rosso. I semi valgono ♠ Picche > ♣ Fiori > ♦ Quadri > ♥ Cuori. Nella prima mano apre chi possiede il 3♠ e deve includerlo nella prima giocata."],
    ["Combinazioni ordinarie","Sono valide: singola; coppia; tris; scala di almeno 5 valori consecutivi con semi diversi; scala di 5 carte con un tris centrale e singole ai due estremi; cinque coppie di valori consecutivi. Per rispondere serve lo stesso tipo, lo stesso numero di carte e un valore superiore."],
    ["Bomba e Scala Reale","Quattro carte dello stesso valore formano una Bomba. Cinque carte consecutive dello stesso seme formano una Scala Reale. Entrambe battono le combinazioni ordinarie. Una Bomba si batte soltanto con una Bomba superiore; tra Scale Reali contano prima il valore e poi il seme."],
    ["Passo e chiusura del giro","Puoi passare anche per strategia. Quando tutti gli altri passano, l’ultima persona ad aver giocato apre un nuovo giro con una combinazione libera. Se chi chiude non mantiene il giro, apre il giocatore successivo ancora attivo in senso orario."],
    ["Ultima mano e fine della mano","Quando resta una sola carta bisogna dichiarare “Ultima mano!”. L’ordine in cui i giocatori finiscono determina la classifica e i punti della mano."],
    ["Punteggio a squadre","I punti dei due compagni si sommano. Il primo traguardo è 21. Se entrambe le squadre lo raggiungono o superano nella stessa mano, il traguardo sale a 31, poi 41 e infine 51."],
    ["Scambio dalla seconda mano","L’ultimo classificato cede al primo la carta più alta. Il primo restituisce una carta tra 3 e 10. Se l’ultimo ha ricevuto entrambi i Jolly, lo scambio non avviene: in quel caso apre il primo classificato; altrimenti apre l’ultimo."],
  ]
};

const en: typeof it = { ...it,
  install:"Install app",
  how:"How to play", classic:"The Dalmatian classic · online", newGame:"New game", join:"Join", yourName:"Your name", namePh:"What is your name?", howMany:"How many people are playing?", youBots:"you + 3 bots", humans:"humans", allHuman:"all human", create:"Create room", orCode:"or join with a code", code:"CODE", noDownload:"No download. Works on iPhone, Android and desktop.", edition:"2026 Edition", footer:"Play wisely, pass strategically.", exit:"Leave", waiting:"Waiting room", gather:"Gather the table", stillNeed:"Still waiting for", player:"player", players:"players", botsFill:"Bots will fill the remaining seats.", roomCode:"Room code", copied:"Link copied!", copyInvite:"Copy invite link", waitingSeat:"Waiting…", team:"Team", amber:"Amber", jade:"Jade", target:"Target", you:"You", cards:"cards", lastCard:"LAST CARD!", place:"place", yourTurn:"Your turn", turnOf:"Turn of", matchOver:"Match over", handOver:"Hand over", newRound:"New round", freePlay:"play any valid combination", passed:"Passed", yourHand:"Your hand", selected:"selected", selectCards:"Select cards to play", pass:"Pass", play:"Play", newHand:"New hand", home:"Back to start", tableLog:"Table log", unexpected:"Unexpected error.", lobby:"Lobby chat", lobbyTitle:"Murlan Lobby", organize:"Organize a game", lobbyEmpty:"The lobby is quiet. Break the ice.", enterRoom:"Join", inviteRoom:"Invite to room", writeLobby:"Write in the lobby…", nameFirst:"Enter your name first", send:"Send", notify:"Enable alerts for new invitations", inviteMessage:"Want to play? Join my room.", notification:"in the Murlan lobby",
  suits:{H:"Hearts",D:"Diamonds",C:"Clubs",S:"Spades",X:"Joker"}, kinds:{single:"Single",pair:"Pair",triple:"Triple",straight:"Straight","triple-run":"Triple straight","five-pairs":"Five-pair straight",bomb:"Bomb","straight-flush":"Straight flush"},
  rulesTitle:"How to play Murlan", rulesEdition:"2026 Rules", rulesIntro:"Get rid of every card before your opponents. Opposite seats are partners: Amber (1 and 3) versus Jade (2 and 4).", rules:[
    ["Setup and objective","Use a 54-card French deck including the Black and Red Jokers. Deal every card: two players receive 14 and two receive 13. Finishing positions score 3, 2, 1 and 0 points; partners add their points."],
    ["Order and opening","The order is 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2, Black Joker, Red Joker. Suits rank ♠ Spades > ♣ Clubs > ♦ Diamonds > ♥ Hearts. In the first hand, whoever holds 3♠ leads and must include it in the opening play."],
    ["Ordinary combinations","Valid plays are: single; pair; triple; straight of at least 5 consecutive ranks with mixed suits; five-card run with a central triple and one adjacent single at each end; five consecutive pairs. A response must use the same type and card count with a higher value."],
    ["Bomb and Straight Flush","Four cards of one rank form a Bomb. Five consecutive cards of one suit form a Straight Flush. Both beat ordinary combinations. Only a higher Bomb beats a Bomb; Straight Flushes compare sequence value first, then suit."],
    ["Passing and closing a round","You may pass strategically. After every other active player passes, the last player to make a valid play starts a new round with any combination. If a player goes out but does not retain the lead, the next active player clockwise opens."],
    ["Last card and hand end","With one card left, the player must declare “Last card!”. The order in which players go out determines the ranking and hand points."],
    ["Team scoring","Partners add their points. The first target is 21. If both teams reach or exceed it in the same hand, the target rises to 31, then 41, and finally 51."],
    ["Exchange from the second hand","The last-place player gives their highest card to the winner. The winner returns one card ranked 3 through 10. If the last-place player received both Jokers, no exchange occurs: the winner leads; otherwise the last-place player leads."],
  ]
};

const es: typeof it = { ...it,
  install:"Instalar app",
  how:"Cómo jugar", classic:"El clásico dálmata · online", newGame:"Nueva partida", join:"Entrar", yourName:"Tu nombre", namePh:"¿Cómo te llamas?", howMany:"¿Cuántas personas juegan?", youBots:"tú + 3 bots", humans:"humanos", allHuman:"todos humanos", create:"Crear sala", orCode:"o entra con un código", code:"CÓDIGO", noDownload:"Sin descargas. Funciona en iPhone, Android y ordenador.", edition:"Edición 2026", footer:"Juega con cabeza, pasa con estrategia.", exit:"Salir", waiting:"Sala de espera", gather:"Reúne la mesa", stillNeed:"Faltan", player:"jugador", players:"jugadores", botsFill:"Los bots ocuparán los asientos restantes.", roomCode:"Código de sala", copied:"¡Enlace copiado!", copyInvite:"Copiar enlace de invitación", waitingSeat:"Esperando…", team:"Equipo", amber:"Ámbar", jade:"Jade", target:"Objetivo", you:"Tú", cards:"cartas", lastCard:"¡ÚLTIMA CARTA!", place:"puesto", yourTurn:"Tu turno", turnOf:"Turno de", matchOver:"Partida terminada", handOver:"Mano terminada", newRound:"Nueva ronda", freePlay:"juega cualquier combinación válida", passed:"Han pasado", yourHand:"Tu mano", selected:"seleccionadas", selectCards:"Selecciona las cartas", pass:"Paso", play:"Jugar", newHand:"Nueva mano", home:"Volver al inicio", tableLog:"Diario de la mesa", unexpected:"Error inesperado.", lobby:"Chat del lobby", lobbyTitle:"Lobby Murlan", organize:"Organiza una partida", lobbyEmpty:"El lobby está en silencio. Rompe el hielo.", enterRoom:"Entrar", inviteRoom:"Invitar a la sala", writeLobby:"Escribe en el lobby…", nameFirst:"Primero escribe tu nombre", send:"Enviar", notify:"Activar avisos de nuevas invitaciones", inviteMessage:"¿Quieres jugar? Entra en mi sala.", notification:"en el lobby de Murlan",
  suits:{H:"Corazones",D:"Diamantes",C:"Tréboles",S:"Picas",X:"Joker"}, kinds:{single:"Individual",pair:"Pareja",triple:"Trío",straight:"Escalera","triple-run":"Escalera con trío","five-pairs":"Escalera de cinco parejas",bomb:"Bomba","straight-flush":"Escalera real"},
  rulesTitle:"Cómo jugar a Murlan", rulesEdition:"Reglamento 2026", rulesIntro:"Deshazte de todas tus cartas antes que los rivales. Los asientos opuestos forman equipo: Ámbar (1 y 3) contra Jade (2 y 4).", rules:[
    ["Preparación y objetivo","Se usa una baraja francesa de 54 cartas, incluidos el Joker Negro y el Rojo. Se reparten todas: dos jugadores reciben 14 y dos reciben 13. Los puestos otorgan 3, 2, 1 y 0 puntos; los compañeros suman sus puntos."],
    ["Orden y apertura","El orden es 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2, Joker Negro y Joker Rojo. Los palos valen ♠ Picas > ♣ Tréboles > ♦ Diamantes > ♥ Corazones. En la primera mano abre quien tiene el 3♠ y debe incluirlo en la primera jugada."],
    ["Combinaciones ordinarias","Son válidas: individual; pareja; trío; escalera de al menos 5 valores consecutivos con palos distintos; secuencia de cinco cartas con un trío central y una carta adyacente en cada extremo; cinco parejas consecutivas. La respuesta debe ser del mismo tipo y número de cartas, pero superior."],
    ["Bomba y Escalera Real","Cuatro cartas del mismo valor forman una Bomba. Cinco cartas consecutivas del mismo palo forman una Escalera Real. Ambas vencen combinaciones ordinarias. Una Bomba solo se vence con otra superior; entre Escaleras Reales se compara primero el valor y después el palo."],
    ["Pasar y cerrar la ronda","Puedes pasar por estrategia. Cuando todos los demás pasan, quien hizo la última jugada válida abre una nueva ronda con cualquier combinación. Si quien termina no conserva la salida, abre el siguiente jugador activo en sentido horario."],
    ["Última carta y fin de la mano","Al quedar una carta hay que declarar “¡Última carta!”. El orden de salida determina la clasificación y los puntos."],
    ["Puntuación por equipos","Se suman los puntos de los compañeros. El primer objetivo es 21. Si ambos equipos lo alcanzan o superan en la misma mano, sube a 31, después 41 y finalmente 51."],
    ["Intercambio desde la segunda mano","El último entrega su carta más alta al primero. El primero devuelve una carta del 3 al 10. Si el último recibió ambos Jokers no hay intercambio: abre el primero; de lo contrario abre el último."],
  ]
};

const sq: typeof it = { ...it,
  install:"Instalo aplikacionin",
  how:"Si luhet", classic:"Klasikja dalmate · online", newGame:"Lojë e re", join:"Hyr", yourName:"Emri yt", namePh:"Si quhesh?", howMany:"Sa persona luajnë?", youBots:"ti + 3 bote", humans:"lojtarë", allHuman:"të gjithë lojtarë", create:"Krijo dhomën", orCode:"ose hyr me një kod", code:"KODI", noDownload:"Pa shkarkim. Punon në iPhone, Android dhe kompjuter.", edition:"Botimi 2026", footer:"Luaj me mend, paso me strategji.", exit:"Dil", waiting:"Dhoma e pritjes", gather:"Mblidh tryezën", stillNeed:"Duhen edhe", player:"lojtar", players:"lojtarë", botsFill:"Vendet e mbetura do t’i plotësojnë botet.", roomCode:"Kodi i dhomës", copied:"Lidhja u kopjua!", copyInvite:"Kopjo lidhjen e ftesës", waitingSeat:"Në pritje…", team:"Skuadra", amber:"Qelibar", jade:"Zhade", target:"Objektivi", you:"Ti", cards:"letra", lastCard:"LETRA E FUNDIT!", place:"vendi", yourTurn:"Radha jote", turnOf:"Radha e", matchOver:"Loja përfundoi", handOver:"Dora përfundoi", newRound:"Raund i ri", freePlay:"luaj çdo kombinim të vlefshëm", passed:"Pasuan", yourHand:"Letrat e tua", selected:"të zgjedhura", selectCards:"Zgjidh letrat për të luajtur", pass:"Pas", play:"Luaj", newHand:"Dorë e re", home:"Kthehu në fillim", tableLog:"Ditari i tryezës", unexpected:"Gabim i papritur.", lobby:"Biseda e lobit", lobbyTitle:"Lobi Murlan", organize:"Organizo një lojë", lobbyEmpty:"Lobi është i qetë. Fillo bisedën.", enterRoom:"Hyr", inviteRoom:"Fto në dhomë", writeLobby:"Shkruaj në lobi…", nameFirst:"Vendos më parë emrin", send:"Dërgo", notify:"Aktivizo njoftimet për ftesat", inviteMessage:"Dëshiron të luash? Hyr në dhomën time.", notification:"në lobin Murlan",
  suits:{H:"Zemra",D:"Karo",C:"Spathi",S:"Maça",X:"Xhol"}, kinds:{single:"Tek",pair:"Dyshe",triple:"Treshe",straight:"Shkallë","triple-run":"Shkallë me treshe","five-pairs":"Shkallë me pesë dyshe",bomb:"Bombë","straight-flush":"Shkallë mbretërore"},
  rulesTitle:"Si luhet Murlan", rulesEdition:"Rregullorja 2026", rulesIntro:"Hiqi të gjitha letrat para kundërshtarëve. Vendet përballë janë partnerë: Qelibari (1 dhe 3) kundër Zhades (2 dhe 4).", rules:[
    ["Përgatitja dhe qëllimi","Përdoret një kuvertë franceze me 54 letra, përfshirë Xholin e Zi dhe të Kuq. Shpërndahen të gjitha: dy lojtarë marrin 14 letra dhe dy marrin 13. Vendet japin 3, 2, 1 dhe 0 pikë; partnerët i mbledhin pikët."],
    ["Renditja dhe hapja","Renditja është 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2, Xholi i Zi, Xholi i Kuq. Shenjat renditen ♠ Maça > ♣ Spathi > ♦ Karo > ♥ Zemra. Dorën e parë e hap ai që ka 3♠ dhe duhet ta përfshijë në lojën e parë."],
    ["Kombinimet e zakonshme","Vlejnë: një letër; dyshe; treshe; shkallë me të paktën 5 vlera radhazi me shenja të ndryshme; pesë letra me një treshe në mes dhe nga një letër ngjitur në skaje; pesë dyshe radhazi. Përgjigjja duhet të ketë të njëjtin lloj e numër letrash, por vlerë më të lartë."],
    ["Bomba dhe Shkalla Mbretërore","Katër letra me të njëjtën vlerë formojnë Bombë. Pesë letra radhazi të së njëjtës shenjë formojnë Shkallë Mbretërore. Të dyja mundin kombinimet e zakonshme. Bombën e mund vetëm një Bombë më e lartë; Shkallët Mbretërore krahasohen fillimisht nga vlera, pastaj nga shenja."],
    ["Pasimi dhe mbyllja e raundit","Mund të pasosh për strategji. Kur të gjithë të tjerët pasojnë, lojtari i fundit që luajti hap raund të ri me çdo kombinim. Nëse lojtari që mbaron nuk ruan hapjen, hap lojtari tjetër aktiv në drejtim të akrepave të orës."],
    ["Letra e fundit dhe fundi i dorës","Kur mbetet një letër duhet deklaruar “Letra e fundit!”. Renditja e daljes përcakton klasifikimin dhe pikët."],
    ["Pikët e skuadrës","Pikët e partnerëve mblidhen. Objektivi i parë është 21. Nëse të dyja skuadrat e arrijnë ose e kalojnë në të njëjtën dorë, ai rritet në 31, pastaj 41 dhe në fund 51."],
    ["Shkëmbimi nga dora e dytë","I fundit i jep fituesit letrën e tij më të lartë. Fituesi kthen një letër nga 3 deri në 10. Nëse i fundit ka marrë të dy Xholat, shkëmbimi nuk bëhet: hap fituesi; përndryshe hap i fundit."],
  ]
};

export const translations = { it, en, es, sq };
export type Copy = typeof it;

export function translateLog(line: string, lang: Language) {
  if (lang === "it") return line;
  const c = translations[lang];
  return line
    .replace("La partita è iniziata. Il 3♠ apre la prima mano.", lang === "en" ? "The game has started. 3♠ opens the first hand." : lang === "es" ? "La partida ha comenzado. El 3♠ abre la primera mano." : "Loja filloi. 3♠ hap dorën e parë.")
    .replace(" gioca ", lang === "en" ? " plays " : lang === "es" ? " juega " : " luan ")
    .replace(" passa.", lang === "en" ? " passes." : lang === "es" ? " pasa." : " pason.")
    .replace(" apre un nuovo giro.", lang === "en" ? " opens a new round." : lang === "es" ? " abre una nueva ronda." : " hap një raund të ri.")
    .replace("Mano conclusa:", c.handOver + ":")
    .replace("Squadra Ambra", `${c.team} ${c.amber}`).replace("Squadra Giada", `${c.team} ${c.jade}`)
    .replace(" ha chiuso in ", lang === "en" ? " finished in " : lang === "es" ? " terminó en " : " përfundoi në ")
    .replace(" posizione.", lang === "en" ? " place." : lang === "es" ? " puesto." : " vend.");
}

export function translateError(message: string, lang: Language) {
  if (lang === "it") return message;
  const map: Array<[string,string,string,string]> = [
    ["Non è il tuo turno","It is not your turn","No es tu turno","Nuk është radha jote"],
    ["Una carta scelta non è disponibile","A selected card is no longer available","Una carta seleccionada ya no está disponible","Një letër e zgjedhur nuk është më e disponueshme"],
    ["Questa combinazione non è valida","This combination is not valid","Esta combinación no es válida","Ky kombinim nuk është i vlefshëm"],
    ["La prima giocata deve contenere il 3♠","The opening play must include 3♠","La primera jugada debe incluir el 3♠","Loja e parë duhet të përmbajë 3♠"],
    ["Devi giocare lo stesso tipo più alto","Play the same type at a higher value, or a special combination","Debes jugar el mismo tipo con valor superior o una combinación especial","Duhet të luash të njëjtin lloj me vlerë më të lartë ose një kombinim special"],
    ["Chi apre il giro non può passare","The player opening the round cannot pass","Quien abre la ronda no puede pasar","Lojtari që hap raundin nuk mund të pasojë"],
    ["Stanza non trovata","Room not found","Sala no encontrada","Dhoma nuk u gjet"],
    ["Codice stanza non valido","Invalid room code","Código de sala no válido","Kodi i dhomës nuk është i vlefshëm"],
  ];
  const idx = lang === "en" ? 1 : lang === "es" ? 2 : 3; const found = map.find(([it]) => message.includes(it));
  return found ? found[idx] : translations[lang].unexpected;
}
