/* The fact bank, in French. Two lines a day on the home screen.

   DAYS is the main line, keyed to an exact streak count, and each entry speaks
   of a span that matches its key, mostly what her body has been doing for that
   long. The number on screen and the number in the sentence are the same number.
   An entry that does not fit its key goes in POOL instead, however good it is.

   POOL is the bonus line, and the main line on a day with no key. Nothing
   repeats until the whole pool has been spent.

   BREAKS shows after a missed day, under what it cost (−4), until she trains
   again. Picked by the number of breaks so far, so never the same twice in a row.

   None of them ever talks about the app. Every one has to be true: this is
   the incentive, and a wrong fact found once makes every other one suspect.
   Different facts from Loop's bank on purpose, since she runs both. -------- */
"use strict";

const DAYS = {
  1:   "Ton corps remplace environ 330 milliards de cellules par jour, à peu près un pour cent de toi. Aujourd'hui, une partie de ce chantier-là a travaillé pour tes jambes.",
  2:   "Après un effort, un muscle fabrique des protéines plus vite que d'habitude pendant environ 48 heures. Le chantier d'hier roule encore.",
  3:   "Une courbature est à son pire entre 24 et 72 heures après l'effort. Si t'en avais une, elle est sur son départ.",
  5:   "La paroi de ton intestin se remplace au complet à peu près aux cinq jours. C'est un des tissus qui se renouvellent le plus vite dans ton corps.",
  7:   "Une semaine. En sept jours, la Terre parcourt environ 18 millions de kilomètres autour du Soleil.",
  10:  "En dix jours, ton coeur a battu environ un million de fois.",
  14:  "Deux semaines. Les premiers gains de force viennent du système nerveux, pas du muscle : ton cerveau apprend à activer plus de fibres en même temps. C'est là que ça se passe en ce moment.",
  20:  "En 2007, des chercheurs ont mesuré un quadriceps plus gros après seulement 20 jours d'entraînement. Les tiens ont eu le même délai.",
  21:  "La règle des 21 jours pour prendre une habitude vient d'un chirurgien plastique des années 60, qui parlait du temps qu'il faut pour s'habituer à son nouveau visage. Personne l'a jamais mesurée. La vraie moyenne arrive plus tard.",
  30:  "Un mois. En un mois, tes ongles poussent d'environ trois millimètres.",
  42:  "Six semaines, c'est le temps qu'on donne en général à un os cassé pour se ressouder.",
  60:  "Les globules rouges qui circulaient il y a 60 jours sont rendus à la moitié de leur vie. Ils en durent environ 120.",
  66:  "En 2009, une équipe de Londres a suivi des gens qui prenaient une nouvelle habitude quotidienne. Pour la personne typique, le geste devenait automatique au jour 66. T'y es.",
  90:  "Trois mois. C'est à peu près le temps qu'un tendon prend pour s'adapter à une nouvelle charge. Les muscles changent en quelques semaines, les tendons en quelques mois.",
  100: "Cent jours. En cent jours, un cheveu pousse d'environ quatre centimètres.",
  111: "Les Cent-Jours de Napoléon, en 1815, en ont duré 111. Tu viens de les égaler.",
  120: "Tous les globules rouges qui circulaient il y a 120 jours ont été remplacés. Ils vivent environ 120 jours.",
  183: "Six mois. En 183 jours, la Terre fait la moitié de son tour : elle est rendue exactement de l'autre bord du Soleil.",
  365: "Un an. La Terre a fait un tour complet du Soleil. Elle est revenue à la même place. Toi, t'es pas tout à fait la même."
};

const POOL = [
  "La rotule est un os qui pousse à l'intérieur d'un tendon. C'est le plus gros de ce genre-là dans le corps.",
  "Le cartilage derrière la rotule est le plus épais de tout le corps.",
  "Le cartilage n'a pas de vaisseaux sanguins. Il se nourrit du liquide autour de lui, poussé dedans et dehors par le mouvement. Bouger, c'est littéralement le nourrir.",
  "En montant un escalier, ton genou encaisse environ trois fois ton poids.",
  "Le genou est la plus grosse articulation du corps.",
  "Chaque genou a deux ménisques, des coussins de cartilage en forme de C qui répartissent la charge entre le fémur et le tibia.",
  "Le grand fessier est le plus gros muscle du corps.",
  "Le moyen fessier, celui de l'abduction, empêche ton bassin de tomber du côté de la jambe levée. Il fait ça à chaque pas que tu fais.",
  "Le tendon d'Achille est le plus gros et le plus fort tendon du corps.",
  "En course, le soléaire, un des muscles du mollet, peut produire plus de six fois le poids du corps.",
  "Un fémur résiste mieux à l'écrasement que du béton.",
  "Ton squelette au complet se renouvelle à peu près aux dix ans. Les os sont vivants et se reconstruisent selon la charge qu'on leur donne.",
  "Dans un tendon, les fibres de collagène s'alignent dans la direction de la force qu'on lui demande.",
  "Un pied a 26 os. Tes deux pieds ensemble, c'est environ le quart des os de ton corps.",
  "Tu es environ un centimètre plus grande le matin que le soir. Les disques entre tes vertèbres s'écrasent pendant la journée et se regonflent la nuit.",
  "La proprioception, le sens qui dit à ton cerveau où est ta jambe sans que tu la regardes, vient de capteurs dans tes muscles, tes tendons et tes articulations.",
  "Tenir sur une jambe les yeux fermés est beaucoup plus dur, parce que la vue fait une bonne part du travail d'équilibre.",
  "Les nerfs les plus rapides de ton corps transmettent à environ 120 mètres par seconde, plus de 400 km/h.",
  "Ton cerveau pèse environ 2 % de ton poids et brûle environ 20 % de ton énergie.",
  "Il y a plus de 600 muscles dans ton corps.",
  "La force se perd beaucoup plus lentement qu'elle se gagne. Quelques semaines d'arrêt défont peu de chose.",
  "Une pieuvre a trois coeurs.",
  "Les loutres de mer se tiennent par la patte en dormant pour ne pas dériver chacune de leur bord.",
  "Les flamants sont roses à cause de ce qu'ils mangent. Nourris autrement, ils pâlissent.",
  "Un éclair est environ cinq fois plus chaud que la surface du Soleil.",
  "La lumière du Soleil met environ huit minutes à se rendre jusqu'à toi.",
  "Une journée sur Vénus dure plus longtemps qu'une année sur Vénus.",
  "Une étoile de mer n'a pas de cerveau.",
  "Un koala peut dormir jusqu'à 20 heures par jour.",
  "Le coeur d'une baleine bleue pèse à peu près le poids d'une moto.",
  "Le colibri peut battre des ailes jusqu'à 80 fois par seconde.",
  "Le pont de Québec a la plus longue travée cantilever au monde, depuis 1917.",
  "Un chat dort de 12 à 16 heures par jour.",
  "Le mont Everest grandit encore, de quelques millimètres par année.",
  "Il y a plus d'arbres sur Terre que d'étoiles dans la Voie lactée, selon les estimations actuelles : autour de trois mille milliards contre quelques centaines de milliards."
];

const BREAKS = [
  "Une habitude survit à un jour manqué. L'étude de Londres qui a mesuré le temps pour prendre une habitude a aussi trouvé que manquer une fois ne changeait presque rien au résultat.",
  "La force se perd beaucoup plus lentement qu'elle se gagne. Quelques jours manqués ne défont presque rien.",
  "Le pont de Québec s'est effondré deux fois pendant sa construction, en 1907 et en 1916. Il est debout depuis 1917.",
  "Un muscle qui a déjà été entraîné retrouve sa force plus vite après un arrêt qu'il l'a gagnée la première fois.",
  "Neil Armstrong a dû s'éjecter d'un véhicule d'entraînement qui s'écrasait, un peu plus d'un an avant de marcher sur la Lune.",
  "Le premier vol d'Ariane 5 a explosé après 37 secondes. La fusée a ensuite volé plus de cent fois.",
  "Babe Ruth a été retiré au bâton presque deux fois plus souvent qu'il a frappé de circuit.",
  "Un tendon garde pas rancune. Il répond à la charge que tu lui donnes à partir d'aujourd'hui."
];

/* Spreads the draws across the pool instead of walking it in order. 7919 is
   prime, so stepping by it visits every free slot before repeating one. */
function poolPick(day, seenPool, skip){
  const used = seenPool || [];
  let free = POOL.map((_,i)=>i).filter(i => !used.includes(i));
  if(!free.length) free = POOL.map((_,i)=>i);
  if(free.length > 1 && typeof skip === "number"){
    const rest = free.filter(i => i !== skip);
    if(rest.length) free = rest;
  }
  return free[(day * 7919) % free.length];
}

function milestoneFor(day, seenPool){
  if(DAYS[day]) return {text: DAYS[day], keyed: true};
  const pick = poolPick(day, seenPool);
  return {text: POOL[pick], keyed: false, poolIndex: pick};
}

function bonusFor(day, seenPool, skipIndex){
  const pick = poolPick(day + 1, seenPool, skipIndex);
  return {text: POOL[pick], poolIndex: pick};
}

function breakMessage(n){
  return BREAKS[n % BREAKS.length];
}
