# La Scala dei Quattro Regni - specifica tecnica v1

## Obiettivo

Partita online privata per esattamente due giocatori. Il server conserva lo stato autorevole, nasconde la mano avversaria e convalida ogni mossa. Una partita comprende più mani finché un giocatore raggiunge almeno 1.000 punti con almeno 50 punti di vantaggio.

Eccezioni: una Scala del Regno con 12 carte naturali su 13 assegna 500 punti esatti e conclude immediatamente la mano; conclude anche il match se porta il totale del giocatore ad almeno 1.000 punti. La Conquista del Regno con 13 naturali su 13 assegna 1.000 punti esatti e conclude immediatamente il match, senza richiedere 50 punti di vantaggio.

## Stato autorevole

- stanza, codice, stato e data dell'ultima attività;
- due giocatori e token privati di riconnessione;
- mazzo ordinato, monte degli scarti, mani e Re Prigionieri;
- combinazioni personali per Cuori, Quadri, Fiori e Picche;
- Jolly con valore e seme dichiarati;
- blocco, Re Invasore, immunità dopo lo sblocco e Duello eventualmente in attesa della risposta segreta;
- turno, fase e obbligo derivante dalla pesca dagli scarti;
- punteggi della mano, punteggi cumulativi e registro azioni.

Il client riceve solo la propria mano, il numero di carte avversarie e tutte le informazioni pubbliche.

## Macchina a stati del turno

1. `DRAW`: pesca dal mazzo oppure dagli scarti.
2. `MELD`: apre, estende o completa le proprie combinazioni; può sostituire un Jolly avversario se lo ricala subito.
3. `BLOCK`: opzionalmente blocca una combinazione incompleta avversaria.
4. `DISCARD`: scarta una carta consentita e passa il turno.

Il Duello è una sottofase asincrona e atomica, presentata in una schermata dedicata. Il proprietario del Re Legittimo seleziona il K sul tavolo e apre il Duello; nella scena sceglie il rinforzo segreto. Il server congela il tavolo finché il proprietario del Re Invasore non seleziona a sua volta un rinforzo. Soltanto allora estrae dal fondo del mazzo le due Carte del Fato, calcola l'esito e pubblica simultaneamente carte, forze e verdetto. La partita riprende solo dopo che entrambi hanno premuto «Accetta la Sorte».

Il Rito dei Tre Sigilli è un turno speciale atomico in una schermata dedicata: apertura del monte degli scarti come altare, scelta e offerta di tre carte naturali, cattura del Re Invasore e marcatura dell'immunità. Il passaggio del turno avviene soltanto dopo che entrambi hanno premuto «Accetta il Destino».

Alla fine della mano, tavolo e conteggio rimangono ispezionabili. Entrambi i giocatori devono confermare «Nuova Battaglia» prima della distribuzione successiva. Alla fine del match devono invece confermare «Nuovo Dominio»; soltanto la seconda conferma azzera punteggi e stato del match.

## Invarianti principali

- Le carte naturali sono uniche e ogni carta è in una sola zona.
- Una nuova combinazione ha almeno tre carte consecutive dello stesso seme, oppure due consecutive più un Jolly dichiarato.
- Il K può diventare Re Umile in qualsiasi momento, aprendo o estendendo una combinazione naturale del proprio seme e rappresentandone l'unico valore mancante. Il K incastonato non può essere preso o sostituito come un Jolly; soltanto la carta naturale rappresentata lo libera.
- Il Re dello stesso seme può diventare Sovrano dopo che una combinazione valida è già sul tavolo. Vale 25 punti sui nuclei ordinari e 15 con Jolly necessario; se viene agganciato a una Scala Naturale o Militare già completa aggiunge invece +5 punti alla categoria raggiunta.
- Un Jolly indispensabile alla continuità sottrae 10 punti. Un Jolly libero a un'estremità di una scala già completa vale 0: non aggiunge né sottrae punti.
- Le sequenze seguono il ciclo `A-2-3-4-5-6-7-8-9-10-J-Q-K-A`.
- Una combinazione bloccata non cambia finché non è sbloccata.
- Il Jolly di una scala bloccata non può essere sostituito o recuperato. Se la carta naturale corrispondente è il K Legittimo, la liberazione deve passare dal Duello.
- Una Scala Bloccata infligge -20 punti al suo proprietario finché non viene liberata.
- Una combinazione contenente un Re non può essere bloccata.
- Una combinazione di 3 carte è vulnerabile; una scala di 4 carte è vulnerabile soltanto se contiene un Jolly. Quattro carte naturali e tutte le scale da 5 carte in su sono consolidate e non possono essere bloccate.
- Nel Duello, 2–10 valgono il valore nominale, J 11, Q 12, A 15, Jolly 20 e K 0; ogni carta naturale dello stesso seme del proprio Re riceve +5.
- I rinforzi scelti restano nelle mani. Le Carte del Fato vengono reinserite casualmente nella parte centrale del mazzo.
- Se vince il Re Legittimo, cattura l'Invasore, libera la scala e continua il turno. Se vince l'Invasore o vi è parità, la scala resta bloccata e il turno del Legittimo termina senza scarto; nella parità il Legittimo torna in mano.
- Se il rinforzo segreto del Re Legittimo è un altro Re, scatta l'Alleanza Segreta: il rinforzo viene rivelato subito, il Duello è vinto senza Carte del Fato e il Re alleato entra nella Corte dei Re fino alla fine della mano.
- Ogni Re normale controllato in una scala, come Sovrano, come Invasore ancora sul blocco o nella Corte vale +20 punti. Ogni Re catturato resta scoperto tra i Prigionieri, non può essere riutilizzato e vale +30 punti. I Re ancora in mano non contano nel Dominio dei Re.
- Il Rito dei Tre Sigilli richiede tre naturali del seme bloccato, esclude Re e Jolly, non può svuotare la mano e libera infallibilmente la scala catturando l'Invasore.
- Il Jolly recuperato da una scala propria o avversaria deve essere ricalato entro la fine dello stesso turno.
- La carta scelta in profondità dagli scarti deve essere usata entro la fine dello stesso turno; le carte sovrastanti entrano in mano.
- Una normale azione sul tavolo non può lasciare la mano vuota: la chiusura richiede sempre lo scarto finale di una carta naturale.
- Il server non accetta uno scarto agganciabile, salvo sacrificio di scarto o scarto finale di chiusura.
- Re e Jolly possono essere scartati durante la mano, mai come carta finale di chiusura.

## Chiusura e conteggio

La chiusura richiede combinazioni nei quattro semi, almeno tre scale complete, al massimo una scala bloccata e uno scarto finale naturale. Il server ricalcola tutto da zero: categorie finali delle scale, 25 punti per ogni Dominio, 20 punti per ogni Re normale controllato, 30 punti per ogni Re Prigioniero, 50 punti di chiusura e penalità della mano avversaria. Con quattro Domini il bonus massimo è 100 punti. Nessun punteggio proposto dal client viene accettato.

Penalità delle carte residue: 2–10 = -10, A = -15, J/Q/K = -20, Jolly = -30.

## Riconnessione e concorrenza

Ogni mossa include la versione dello stato letta dal client. Il server aggiorna soltanto se la versione coincide, incrementa la versione e registra l'evento. In caso contrario restituisce lo stato aggiornato. Il token di giocatore consente di riprendere la propria sedia senza rivelare la mano all'altro giocatore.

## Estensioni successive

Modalità locale con passaggio dispositivo, IA, profilo persistente, storico completo, classifiche, animazioni avanzate e notifiche.
