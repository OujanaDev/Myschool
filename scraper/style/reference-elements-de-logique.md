## Chapitre 1

Éléments de logique

## Sommaire

I Notions ensemblistes . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1

1) Vocabulaire lié aux ensembles . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1

2) Propriétés . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3

II Notions de logique . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3

1) Propositions . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3

2) Connecteurs logiques . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4

3) Propriétés . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5

4) Quantificateurs . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6

5) Retour sur les ensembles . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6

III Le raisonnement . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8

1) Raisonnement par l’absurde . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8

2) Raisonnement par analyse-synthèse . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8

3) Démontrer une implication . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8

4) L’équivalence . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9

5) La récurrence . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9

IV Solution des exercices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 10 I NOTIONS ENSEMBLISTES

### 1) Vocabulaire lié aux ensembles

Nous ne définirons pas rigoureusement la notion d’ensemble, celle-ci sera considérée comme intuitive.

Nous nous contenterons de la « définition » suivante :

Un ensemble E est une collection d’objets 1

, ceux-ci sont appelés éléments de E . Si x est un élément de E on écrira x ∈ E (se lit « x appartient à E »), dans le cas contraire on écrira x ∉ E . Si E n’a pas d’éléments on dira que c’est l’ensemble vide et on le notera ∅ . Deux ensembles E et F sont dits égaux si et seulement si ils ont les mêmes éléments, on écrira alors E = F .

Définition 1.1

Z Exemples :

– Les ensembles de nombres : N , Z , D , Q , R , C .

– L’ensemble des fonctions de R dans R : F ( R , R ).

– Ensembles définis en extension , comme : E = { 1; 8; 6; 2 } (éléments non ordonnés et devant apparaître une seule fois dans la liste).

– Ensembles définis en compréhension , comme : E = {

p ∈ N

∣

∣ p est impair

}

= { 2 k + 1 | k ∈ N } .

1 . Cependant toute collection d’objets ne constitue pas forcément un ensemble. Par exemple, le paradoxe de Bertrand Russel a montré que l’ensemble des ensembles ne peut pas exister, sinon, la considération de l’ensemble y = { x | x ∉ x } conduit à une absurdité.

 L’écriture E =

{

p ∈ N

∣

∣

p est impair

}

ne signifie pas que E est un ensemble qui contient un seul élément qui s’appelle p , mais que E est l’ensemble de tous les entiers naturels p tels que p est impair, en langage courant on dit plutôt que E est l’ensemble de tous les entiers naturels impairs. Dans le langage mathématique, il faut donner un nom à ces entiers (variable muette, ici p ) pour pouvoir ensuite les manipuler ou les décrire.

Attention !

Soient A et B deux ensembles :

– L’inclusion : on dit que A est inclus dans B tous les éléments de A sont également éléments de B , notation : A ⊂ B .

– Ensemble des parties : si A est inclus dans B , on dit que A est une partie de B . L’ensemble des parties de B est noté P ( B ) , donc écrire « A ⊂ E » revient à écrire « A ∈ P ( B ) ». Par exemple, l’ensemble vide et B sont des parties de B , donc ∅ ∈ P (B) et B ∈ P (B) .

– La réunion : on note A ∪ B (se lit « A union B »), l’ensemble que l’on obtient en regroupant les éléments de A avec ceux de B , par exemple { 2 k + 1 | k ∈ Z } ∪ { 2 n | n ∈ Z } = Z .

– L’intersection : on note A ∩ B (se lit « A inter B »), l’ensemble des éléments communs à A et B .

Par exemple N ∩ Z

∗

= N

∗

. On dit que deux ensembles sont disjoints lorsque leur intersection est l’ensemble vide.

– La différence : on note A \ B (se lit « A moins B »), l’ensemble des éléments qui sont dans A mais pas dans B . Par exemple, R

+

= R \] −∞ ; 0[ .

– Le complémentaire d’une partie : lorsque A est une partie de B , la différence B \ A est appelé com- plémentaire de A dans B , noté C B ( A ) (ou bien A ). Par exemple R \ Q est l’ensemble des irrationnels.

– Le produit cartésien : le produit cartésien de A par B est l’ensemble des couples ( x ; y ) avec x ∈ A et y ∈ B , on le note A × B , c’est à dire A × B = {

( x ; y )

∣

∣

x ∈ E, y ∈ F

}

. On rappelle que ( x ; y ) = ( a ; b ) si et seulement si x = a et y = b . Attention à ne pas confondre un couple avec une paire (ensemble à deux éléments), par exemple : { 1; 2 } = { 2; 1 } , mais (1; 2) 6= (2; 1) .

Définition 1.2

B

A

A ⊂ B

B A

A 6⊂ B

A B

A ∪ B

A B

A ∩ B

 A B

A \ B

B

A

C B (A)

F Exercice 1.1 Décrire P (E) lorsque E = { 1; 2; 3 } .

Remarque 1.1 :

– Dire que deux ensembles A et B sont égaux, revient à dire que A est inclus dans B , et que B est inclus dans A . Donc démontrer une égalité entre deux ensembles, peut se faire en démontrant une double inclusion .

– Le produit cartésien se généralise à trois ensembles ou plus généralement à n ensembles :

E 1 ×···× E n = { ( x 1 , . . . , x n ) | x 1 ∈ E 1 , . . . , x n ∈ E n } Lorsque tous les ensembles sont égaux au même ensemble E , on note E ×···× E = E n

(ensemble des

n-listes, ou n-uplets d’éléments de E ).

### 2) Propriétés

Soient A , B et C trois ensembles, on a A ∪ ( B ∩ C ) = ( A ∪ B ) ∩ ( A ∪ C ) . C’est la distributivité de la réunion sur l’intersection.

De même, on a A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C) . C’est la distributivité de l’intersection sur la réunion.

Théorème 1.1 (Propriétés de la réunion et de l’intersection) Preuve : Ceci sera démontré un peu plus loin.  Si A et B sont deux parties d’un ensemble E :

– A ∪ C E (A) = E .

– C E (E) = ∅ , C E ( ∅ ) = E .

– C E ( C E (A)) = A .

– C E (A ∪ B) = C E (A) ∩ C E (B) (loi de De Morgan 2

).

– C E (A ∩ B) = C E (A) ∪ C E (B) (2

e

loi de De Morgan ).

Théorème 1.2 (Propriétés du complémentaire) Preuve : Ceci sera démontré un peu plus loin.  II NOTIONS DE LOGIQUE

### 1) Propositions

Nous nous contenterons de la « définition » suivante :

Une proposition est une phrase (ou assertion) qui a un sens mathématique et qui est soit vraie soit fausse

3

. On dira qu’une proposition n’a que deux valeurs de vérité : vraie (notée V ) et fausse (notée F).

Si P désigne une assertion, on notera ¬ P sa négation (lire « non P »).

Définition 1.3 (Proposition)

Z Exemples :

– « 2 est un entier pair » est une proposition vraie.

– « 3 est un entier pair » est une proposition fausse.

2. DE MORGAN Augustus (1806 – 1871) logicien anglais.

3. Il ne doit pas y avoir d’autre alternative selon le principe du tiers exclu.

 – « n est un entier pair » n’est pas une proposition car sa valeur de vérité dépend de la valeur de n , un telle phrase est appelée prédicat portant sur la variable n à valeurs dans Z , on pourrait noter ce prédicat P( n ) par exemple.

– Si A et B désignent deux ensembles, alors la phrase A ⊂ B est une proposition (tous les éléments de A sont éléments de B). Sa négation s’écrit A 6⊂ B (un élément de A n’est pas forcément un élément de B).

– L’expression « N ∈ R » est une proposition, elle est fausse car N n’est pas un réel.

– L’expression « N ⊂ R » est une proposition, elle est vraie car tout naturel est aussi un réel.

Si P est une proposition, la valeur de vérité de ¬ P se déduit de celle de P conformément à la table de vérité suivante :

P ¬ P

V F

F V

Par convention :

Dans les raisonnements mathématiques on n’écrit que des propositions vraies. Si P est une proposition, au lieu d’écrire « P est vraie », on écrit plus simplement « P », et au lieu d’écrire « P est fausse », on écrit plus simplement « ¬ P », c’est à dire la négation.

### 2) Connecteurs logiques

Ceux-ci permettent de relier deux propositions pour en donner une troisième.

Soient P et Q deux propositions. On dit que :

- la proposition « P ∧ Q » (lire « P et Q ») est vraie lorsque les deux propositions le sont simultanément,

sinon on dira qu’elle fausse.

- la proposition « P ∨ Q » (lire « P ou Q ») est vraie lorsqu’au moins une des deux propositions est vraie

(voire les deux), sinon on dira qu’elle fausse.

Définition 1.4 (conjonction, disjonction inclusive) P Q P ∧ Q P ∨ Q

V V V V

V F F V

F V F V

F F F F

Soient P et Q deux propositions. On dit que :

- la proposition « P =⇒ Q » (lire « P implication Q ») est fausse lorsque P est vraie mais pas Q .

- la proposition « P ⇐⇒ Q » (lire « P équivalence Q ») est vraie lorsque les deux propositions ont la

même valeur de vérité .

Définition 1.5 (implication, équivalence) P Q P =⇒ Q P ⇐⇒ Q

V V V V

V F F F

F V V F

F F V V

Z Exemples :

– La proposition « (2 est pair) =⇒ (3 est impair) » est vraie.

– La proposition « (2 est impair) =⇒ (3 est pair) » est vraie 4

.

– La proposition « (2 est pair) =⇒ (3 est pair) » est fausse.

– La proposition « (2 est impair) ⇐⇒ (3 est pair) » est vraie.

4. Ceci peut paraître surprenant au premier abord, mais nous verrons qu’en écrivant la négation cela devient évident.

 Soient P et Q deux propositions.

- Lorsque la proposition « P =⇒ Q » est vraie on dit « P implique Q » (ou « si P alors Q »).

- Lorsque la proposition « P ⇐⇒ Q » est vraie on dit que « P équivaut à Q » (ou « P est équivalent à Q »

ou encore « P si et seulement si Q »).

Définition 1.6 (implique, équivaut)

Principe de déduction

Soient P et Q deux propositions, si on sait que P implique Q , et que P est vraie, alors on a forcément Q vraie d’après la définition de l’implication. C’est le principe de déduction 5

.

### 3) Propriétés

Maintenant que nous savons ce que sont des propositions équivalentes, nous allons pouvoir établir les propriétés suivantes :

Soient P et Q deux propositions :

– La proposition « ¬¬ P » est équivalente à « P ».

– La proposition « ¬ (P ∧ Q) » est équivalente à « ( ¬ P) ∨ ( ¬ Q) » (1 re

loi de De Morgan ).

– La proposition « ¬ (P ∨ Q) » est équivalente à « ( ¬ P) ∧ ( ¬ Q) » (2 e

loi de De Morgan ).

– L’implication « P =⇒ Q » est équivalente à « ( ¬ P) ∨ Q ».

– La proposition « ¬ (P =⇒ Q) » est équivalente à « P ∧ ( ¬ Q) ».

– La proposition « P ⇐⇒ Q » est équivalente à « (P =⇒ Q) ∧ (Q =⇒ P) ».

– La proposition « P ⇐⇒ Q » est équivalente à « ( ¬ P) ⇐⇒ ( ¬ Q) ».

Théorème 1.3

Preuve : La première propriété est évidente. Les autres se montrent avec une table de vérité (à compléter en exercice) :

P Q ¬ (P ∧ Q) ( ¬ P) ∨ ( ¬ Q) ¬ (P ∨ Q) ( ¬ P) ∧ ( ¬ Q) P =⇒ Q ( ¬ P) ∨ Q V V

V F

F V

F F

P Q ¬ (P =⇒ Q) P ∧ ( ¬ Q) P ⇐⇒ Q (P =⇒ Q) ∧ (Q =⇒ P) ( ¬ P) ⇐⇒ ( ¬ Q) V V

V F

F V

F F



Z Exemple : La négation de la proposition « (2 est impair) =⇒ (3 est pair) » est équivalente à la proposition « (2 est impair) ∧ (3 est impair) », or celle-ci est fausse, et donc la première est vraie.

F Exercice 1.2 Sans utiliser de table de vérité, redémontrer (en utilisant les autres propriétés) que :

« ¬ (P =⇒ Q) » est équivalente à « P ∧ ( ¬ Q) ».

Soient P et Q deux propositions.

- La réciproque de l’implication « P =⇒ Q » est l’implication « Q =⇒ P ».

- La contraposée de l’implication « P =⇒ Q » est l’implication « ( ¬ Q) =⇒ ( ¬ P) ».

Définition 1.7 (réciproque, contraposée) Il découle alors du théorème précédent :

Une implication et sa contraposée sont équivalentes.

Deux propositions sont équivalentes si et seulement si les implications dans les deux sens sont vraies.

Théorème 1.4

5. Par contre, si P implique Q, et que P est fausse, alors on ne peut rien dire de Q.

 Remarque 1.2 – Ce résultat est à connaître car très utilisé dans les raisonnements (raisonnements par contra- position, raisonnements par double implication).

### 4) Quantificateurs

Les quantificateurs servent à construire des propositions à partir d’un prédicat P ( x ), dont la variable x prend ses valeurs dans un certain ensemble E. On rencontre :

– Le quantificateur universel : « ∀ x ∈ E , P ( x ) » (se lit « pour tout x dans E , P ( x ) [sous entendu est vraie] »).

Par exemple, la proposition « ∀ x ∈ R , x 2

> 0 » se lit « pour tout réel x , le carré de x est positif ou nul », ou bien encore « le carré de tout réel est positif ».

– Le quantificateur existentiel : « ∃ x ∈ E , P ( x ) » (se lit « il existe au moins un x de E tel que P ( x ) [sous entendu est vraie] »). Par exemple, la proposition « ∃ x ∈ C , x 2

=− 1 », se lit « il existe au moins un nombre complexe dont le carré vaut − 1 ».

Remarque 1.3 :

– On rencontre aussi parfois la proposition « ∃ ! x ∈ E , P ( x ) » (se lit « il existe un unique x de E tel que P ( x ) [sous entendu est vraie] »). Par exemple, « ∃ ! x ∈ R +

, x

2

= 2 ».

– On peut trouver plusieurs quantificateurs dans une même proposition. Par exemple, « ∀ y ∈ R +

, ∃ ! x ∈

R

+

, x

2

= y » traduit que tout réel positif est le carré d’un unique réel positif.

Les propositions « ∀ x ∈ A, ∃ y ∈ B, P ( x , y ) » et « ∃ y ∈ B, ∀ x ∈ A, P ( x , y ) », n’ont pas le même sens. En effet, dans la première le y dépend de x alors que dans la seconde il s’agit du même y pour tous les x .

Attention !

Celle-ci est régie par les règles suivantes :

a) La négation de ∀ est ∃ (et vice - versa).

b) On peut intervertir deux quantificateurs de même nature.

c) On ne peut pas intervertir deux quantificateurs de nature différente.

À retenir : utilisation des quantificateurs Z Exemples :

– L’assertion « ∀ x ∈ R

+

, ∃ y ∈ R

+

, y

2

= x » est vraie, elle traduit que tout réel positif ( x ) est le carré d’au moins un réel positif ( y ). Mais l’assertion « ∃ y ∈ R +

, ∀ x ∈ R

+

, y

2

= x » traduit que tout réel positif ( x ) est le carré d’un même réel ( y ), ce qui est évidemment faux. Sa négation est « ∀ y ∈ R +

, ∃ x ∈ R

+

, y

2

6= x ».

– On a toujours l’implication suivante :

(

∃ x ∈ A, ∀ y ∈ B, P( x , y )

)

=⇒

(

∀ y ∈ B, ∃ x ∈ A, P( x , y )

)

.

– La négation de « ∀ x ∈ A, ∃ y ∈ B, P( x , y ) » est « ∃ x ∈ A, ∀ y ∈ B, ¬ (P( x , y )) ».

F Exercice 1.3

1/ Traduire dans le langage mathématique : la suite ( u n ) est majorée. Écrire la négation. Qu’en est-il de la suite définie par u n = n

2

? Justifier.

2/ Traduire dans le langage courant les propositions suivantes :

a) ∃ y ∈ R , ∀ x ∈ R , x 6 y .

b) ∃ y ∈ N , ∀ x ∈ N , y 6 x .

### 5) Retour sur les ensembles

Soient A et B deux parties d’un ensemble E.

Intersection d’ensembles

Si x désigne un élément de E , démontrer que x ∈ A ∩ B , c’est démontrer la proposition « ( x ∈ A ) et ( x ∈ B ) ».

On peut donc écrire : A ∩ B = { x ∈ E | x ∈ A et x ∈ B } .

Réunion d’ensembles

Si x désigne un élément de E , démontrer que x ∈ A ∪ B , c’est démontrer la proposition « ( x ∈ A ) ou ( x ∈ B ) ».

On peut donc écrire : A ∪ B = { x ∈ E | x ∈ A ou x ∈ B } .

 Complémentaire

Si x désigne un élément de E , démontrer que x ∈ C E ( A ), c’est démontrer la proposition « ( x ∉ A ). On peut donc écrire : C E (A) = { x ∈ E | x ∉ A } .

Différence d’ensembles

Si x désigne un élément de E , démontrer que x ∈ A \ B , c’est démontrer la proposition « ( x ∈ A ) et ( x ∉ B ) ».

On peut donc écrire : A \ B = { x ∈ E | x ∈ A et x ∉ B } , il en découle que A \ B = A ∩ C E (B).

Inclusion d’ensembles

Démontrer que A est inclus dans B , c’est démontrer que les éléments de A sont également des éléments de B , c’est à dire, pour tout élément x de E , on a : x ∈ A =⇒ x ∈ B . Pour établir ceci, on prend un élément x quelconque de E, et on démontre la proposition x ∈ A =⇒ x ∈ B.

Égalité d’ensembles

Démontrer que A est égal à B, c’est démontrer la double inclusion : A ⊂ B et B ⊂ A, c’est à dire, pour tout élément x de E , on a : ( x ∈ A =⇒ x ∈ B ) et ( x ∈ B =⇒ x ∈ A ), ce qui équivaut à : x ∈ A ⇐⇒ x ∈ B . Pour établir ceci, on prend un élément x quelconque de E, et on démontre la proposition x ∈ A ⇐⇒ x ∈ B.

Démontrer que A ⊂ B, c’est démontrer : ∀ x ∈ E, x ∈ A =⇒ x ∈ B.

Démontrer que A = B, c’est démontrer : ∀ x ∈ E, x ∈ A ⇐⇒ x ∈ B.

À retenir

Z Exemples :

– Soient A , B et C trois parties d’un ensemble E , démontrer la distributivité de la réunion sur l’intersection c’est démontrer :

∀ x ∈ E,

(

x ∈ A ∪ (B ∩ C)

)

⇐⇒

(

x ∈ [A ∪ B] ∩ [A ∪ C]

)

On considère un x quelconque dans E , on peut alors montrer l’équivalence avec une table de vérité (à compléter en exercice) :

x ∈ A x ∈ B x ∈ C x ∈ A ∪ (B ∩ C) x ∈ [A ∪ B] ∩ [A ∪ C] V V V

V V F

V F V

V F F

F V V

F V F

F F V

F F F

– Soient A et B deux parties d’un ensemble E, soit x un élément quelconque de E, alors :

x ∈ C E (A ∪ B) ⇐⇒ ¬ ( x ∈ A ∪ B)

⇐⇒ ¬ ([ x ∈ A] ∨ [ x ∈ B])

⇐⇒ [ x ∉ A] ∧ [ x ∉ B]

⇐⇒ [ x ∈ C E (A)] ∧ [ x ∈ C E (B)]

⇐⇒ x ∈ C E (A) ∩ C E (B)

Ce qui prouve que C E (A ∪ B) = C E (A) ∩ C E (B).

F Exercice 1.4 En s’inspirant des deux exemples ci-dessus, démontrer le théorème 1.1 et le théorème 1.2 .

Résoudre une équation

Une équation dans R , d’inconnue x réelle peut toujours se mettre sous la forme f ( x ) = 0. Résoudre cette équation dans R c’est déterminer la partie S de R telle que « ∀ x ∈ R , f ( x ) = 0 ⇐⇒ x ∈ S » ( S est appelé l’ensemble des solutions réelles). La définition est la même pour une inéquation dans R .

 Z Exemple : Pour résoudre dans R l’inéquation 1

x

<− 1, on écrit :

1

x

<− 1 ⇐⇒

1

x

+ 1 < 0

⇐⇒

x + 1

x

< 0

⇐⇒ ( x + 1) x < 0 et x 6= 0

⇐⇒ x ∈ ] − 1 ; 0[

L’ensemble des solutions réelles est donc ] − 1 ; 0[.

III LE RAISONNEMENT

### 1) Raisonnement par l’absurde

Soit P une proposition dont on cherche à démontrer qu’elle est vraie. Raisonner par l’absurde c’est faire l’hypothèse que P est fausse, autrement dit, on suppose non( P ), on cherche alors à obtenir une contradiction, c’est à dire une proposition Q dont sait qu’elle est fausse, et telle que non( P ) =⇒ Q . Si on n’y parvient, cela veut dire que « Q et non( Q ) » est vraie, ce qui est impossible car une telle proposition est toujours fausse :

c’est le principe de non contradiction . La conclusion est que P est vraie.

Z Exemple : montrons que

p

2 est un irrationnel par l’absurde :

On suppose que

p

2 ∈ Q , on peut écrire

p

2 =

p

q

avec p et q entiers strictement positifs et premiers entre eux. En élevant au carré on a 2 q

2

= p

2

, ce qui entraîne que p est pair et donc p = 2 a avec a entier, d’où 2 q

2

= 4 a

2

i.e. q

2

= 2 a

2

, donc q est pair lui aussi et par conséquent p et q ne sont pas premiers entre eux :

contradiction.

### 2) Raisonnement par analyse-synthèse

Raisonner par analyse-synthèse lorsque l’on cherche la ou les solutions à un problème, c’est raisonner en deux étapes qui sont :

– l’analyse : on suppose que l’on a une solution du problème et on cherche à en déduire toutes les propriétés possibles de cette solution, l’objectif étant d’essayer de l’identifier au mieux, – la synthèse : elle consiste à déterminer parmi tous les objets mathématiques ayant les propriétés requises (obtenues lors de l’analyse), ceux qui sont effectivement solutions du problème.

Z Exemple : Montrons que toute fonction f : [0; 1] → R est la somme d’une fonction affine et d’une fonction qui s’annule en 0 et en 1.

- Analyse : supposons qu’il existe une fonction g qui s’annule en 0 et en 1, ainsi que deux réels a et b tels

que ∀ x ∈ R , f ( x ) = g ( x ) + a x + b . En évaluant en 0 on doit avoir f (0) = b , en évaluant en 1 on doit avoir f (1) = a + b , d’où a = f (1) − b = f (1) − f (0). Maintenant que a et b sont connus, on en déduit que g est la fonction x 7→ f ( x ) − a x − b

- Synthèse : posons b = f (0), a = f (1) − f (0) et g : x 7→ f ( x ) − a x − b . Il est clair que f ( x ) = g ( x ) + a x + b ,

d’autre part g (0) = f (0) − b = 0 et g (1) = f (1) − a − b = f (1) − f (1) + f (0) − f (0) = 0. Donc a , b et g sont bien solution du problème et celle-ci est unique.

### 3) Démontrer une implication

Par définition, l’implication « P =⇒ Q » est fausse lorsque P est vraie et Q fausse, elle est vraie dans les autres cas. En particulier, si P est fausse, l’implication est nécessairement vraie quelque soit la valeur de vérité de Q . Par contre lorsque P est vraie, tout dépend de Q . Nous savons également que l’implication « P =⇒ Q » est équivalente à sa contraposée « ¬ Q =⇒ ¬ P », donc démontrer l’une c’est démontrer l’autre.

- Méthode directe : on suppose que la proposition P est vraie (c’est l’hypothèse ), on cherche alors à

établir que nécessairement la proposition Q est vraie elle aussi.

- Par l’absurde : on suppose le contraire de P =⇒ Q , c’est à dire on suppose « P ∧¬ Q » ( i.e. P est vraie

et Q est fausse. On montre alors que ceci conduit à une contradiction, ce qui entraîne que l’hypothèse faite est fausse et par conséquent P =⇒ Q.

À retenir : pour démontrer une implication.

- Par contraposition : on cherche à établir que ¬ Q =⇒ ¬ P.

Remarque 1.4 – Pour démontrer « P ∨ Q » : cette proposition est équivalente à « ¬ P =⇒ Q ». Par conséquent, démontrer « P ∨ Q » revient à démontrer « ¬ P =⇒ Q ».

### 4) L’équivalence

Par définition, l’équivalence « P ⇐⇒ Q » est vraie lorsque P et Q ont même valeur de vérité. Nous savons qu’elle équivaut à « ( P =⇒ Q ) et ( Q =⇒ P ) », donc montrer l’équivalence c’est montrer une implication et réciproque.

- Par double implication : on établit dans un premier temps que P =⇒ Q , puis dans un deuxième

temps on établit la réciproque, c’est à dire que Q =⇒ P.

- Méthode directe : on suppose que la proposition P est vraie ( hypothèse ) puis on cherche à établir

que Q est vraie en s’assurant à chaque étape du raisonnement que l’équivalence est conservée 6

.

À retenir : pour démontrer une équivalence.

### 5) La récurrence

Soit P( n ) un prédicat portant sur une variable n ∈ N .

Si on a P (0) (initialisation) et si ∀ n ∈ N , P ( n ) =⇒ P ( n + 1) (hérédité), alors nécessairement ∀ n ∈ N , P ( n ).

À retenir : rappel du principe de récurrence Remarque 1.5 :

– L’initialisation est juste une vérification, mais elle est indispensable.

Par exemple, soit le prédicat P ( n ) :« n = n + 1 », celui-ci vérifie bien l’hérédité ( n = n + 1 =⇒ n + 1 = n + 2 ), mais pour tout n, P( n ) est fausse.

– Démontrer l’hérédité c’est démontrer une implication. En général on le fait par la méthode directe, on fait donc l’hypothèse P ( n ) , c’est ce que l’on appelle l’hypothèse de récurrence , et on essaie d’en déduire P( n + 1) .

Soit a ∈ Z et P( n ) un prédicat portant sur une variable n ∈ Z .

- Si on a P( a ) et si ∀ n > a , P( n ) =⇒ P( n + 1) , alors on peut conclure que ∀ n ∈ Z , n > a =⇒ P( n ) .

- Si on a P ( a ) et si ∀ n 6 a , P ( n ) =⇒ P ( n − 1) , alors on peut conclure que ∀ n ∈ Z , n 6 a =⇒ P ( n )

(récurrence descendante).

Théorème 1.5 (variantes)

Preuve : Pour le premier point, on applique le principe de récurrence au prédicat Q ( n ) = P ( n + a ) avec n ∈ N . Pour le deuxième, on applique le principe de récurrence au prédicat Q( n ) = P( a − n ) avec n ∈ N .  F Exercice 1.5

### 1/ Montrer que ∀ n ∈ N

∗

,

∑ n

k = 1

k =

n ( n + 1)

2

.

### 2/ Montrer que ∀ n ∈ N

∗

,

∑

n

k = 1

k

2

=

(2 n + 1) n ( n + 1)

6

.

### 3/ Montrer que ∀ n ∈ N

∗

,

∑

n

k = 1

k

3

=

(

n ( n + 1)

2

)

2

.

Soit P( n ) un prédicat portant sur une variable n ∈ N .

Si on a P (0) (initialisation) et si ∀∈ N , ( P (0) ∧ P (1) ∧···∧ P ( n )) =⇒ P ( n + 1) (hérédité), alors nécessai- rement ∀ n ∈ N , P( n ) .

Théorème 1.6 (récurrence forte)

Preuve : Appliquer la principe de récurrence au prédicat Q( n ) = P(0) ∧ P(1) ∧···∧ P( n ).  6 . Cette méthode n’est pas toujours applicable, mais c’est celle que l’on utilise dans la mesure du possible pour résoudre une équation ou une inéquation.

 La récurrence forte est utile lorsque le seul fait que P ( n ) soit vraie ne suffit pas à en déduire P ( n + 1).

L’hypothèse de récurrence peut alors s’écrire : « supposons la propriété vraie jusqu’au rang n ».

À retenir

F Exercice 1.6 Soit ( u n ) la suite définie par u 0 = u 1 = 1 et ∀ n ∈ N , u n + 2 = u n + 1 + u n (suite de Fibonacci), montrer par récurrence que pour tout n :

u n =

5 +

p

5

10

(

1 +

p

5

2

) n

+

5 −

p

5

10

(

1 −

p

5

2

) n

IV SOLUTION DES EXERCICES

Solution 1. 1 Dans l’ensemble { 1; 2; 3 } il y a exactement 8 parties, donc :

P (E) = { ∅ ; {1}; {2}; {3}, {1; 2}; {1; 3}; {2; 3}; {1; 2; 3} } Solution 1. 2 « P =⇒ Q » équivaut à « ( ¬ P ) ∨ Q », donc « ¬ ( P =⇒ Q ) » équivaut à « ¬ (( ¬ P ) ∨ Q ) », ce qui équivaut encore à « ( ¬¬ P) ∧ ( ¬ Q) » (loi de De Morgan), soit encore à « P ∧ ( ¬ Q) ».

Solution 1. 3

1/ ∃ M ∈ R , ∀ n ∈ N , u n 6 M . La négation est ∀ M ∈ R , ∃ n ∈ N , u n > M . La suite ( n 2

) n’est pas majorée, en effet : soit M ∈ R , si n ∈ N avec n > M , alors ( n + 1)

2

> n > M .

2/ Traduction :

a) L’ensemble R a un maximum, cette proposition est fausse, sa négation s’écrit ∀ y ∈ R , ∃ x ∈ R , x > y .

b) L’ensemble N a un minimum, cette proposition est vraie.

Solution 1. 4

1/ Démontrer la distributivité de la intersection sur la réunion, c’est démontrer :

∀ x ∈ E,

(

x ∈ A ∩ (B ∪ C)

)

⇐⇒

(

x ∈ [A ∩ B] ∪ [A ∩ C]

)

On considère un x quelconque dans E , on peut alors montrer l’équivalence avec une table de vérité :

x ∈ A x ∈ B x ∈ C x ∈ A ∩ (B ∪ C) x ∈ (A ∩ B) ∪ (A ∩ C) V V V V V

V V F V V

V F V V V

V F F F F

F V V F F

F V F F F

F F V F F

F F F F F

2/ Pour le théorème 1.2 , les trois premiers résultats sont évidents. Montrons les lois de De Morgan à l’aide d’une table de vérité, soient A et B deux parties de E et x un élément quelconque de E :

x ∈ A x ∈ B x ∈ C E (A ∩ B) x ∈ C E (A) ∪ C E (B) V V F F

V F V V

F V V V

F F V V

On en déduit que C E (A ∩ B) = C E (A) ∪ C E (B) . On précède de même pour l’autre loi.

Solution 1. 5

1/ On vérifie la relation pour n = 1 :

∑

1

k = 1

k = 1 =

1(1 + 1)

2

. On suppose ensuite que la relation est vérifiée pour un certain entier n ∈ N

∗

, c’est à dire que

∑

n

k = 1

k =

n ( n + 1)

2

pour un certain n ∈ N

∗

, on a alors au rang suivant :

n + 1 ∑

k = 1

k =

n ∑

k = 1

k + ( n + 1) =

n ( n + 1)

2

+ ( n + 1) =

( n + 1)( n + 2)

2

: c’est la formule au rang n + 1

Donc la formule est vraie pour tout n ∈ N ∗

.

 2/ Même méthode.

3/ Même méthode.

Solution 1. 6 Comme la relation de récurrence est à deux pas, on procède à une récurrence forte avec une initialisation pour n = 0 et n = 1 . Notons a =

5 +

p

5

10

, r 1 =

1 +

p

5

2

, b =

5 −

p

5

10

et r 2 =

1 −

p

5

2

. On vérifie qu’au rang n = 0 on a ar

0

1

+ br

0

2

=

a + b = 1 = u 0 , et que au rang n = 1 on a ar 1

1

+ br

1

2

= ar 1 + br 2 = 1 = u 1 . Pour un entier n > 1 , on suppose la formule établie pour tous les entiers k ∈ J 0 ; n K (hypothèse de récurrence forte), on a u n + 1 = u n + u n − 1 , comme n et n − 1 sont dans J 0 ; n K , l’hypothèse permet d’écrire u n + 1 = ar n

1

+ br

n

2

+ ar

n − 1

1

+ br

n − 1

2

= ar

n − 1

1

[ r 1 + 1] + br

n − 1

2

[ r 2 + 1] , or on peut vérifier

que r 1 + 1 = r

2

1

(de même pour r 2 ), on en déduit que u n + 1 = ar n + 1

1

+ br

n + 1

2

, c’est la formule au rang n + 1 . La formule est donc établie pour tout entier n.
