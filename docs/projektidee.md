# IdleSwarm

## Abstract
Wir entwickeln ein Idle-Browser-Spiel. Nur ein Client für den Spieler - **keine** Multiplayerfunktionen geplant.

## Kernidee
Wir steuern einen "Schwarm" von Organismen, suchen neue Futterstellen, entwickeln uns und werden die dominante Lebensform in sämtlichen Umgebungen.

Der Schwarm beginnt dabei als Einzeller, wird irgendwann vielzellig, geht an Land, erobert sämtliche Biome an Land und lernt irgendwann, mittels hochspezialisierter Organismen gegen entwickelte Zivilisationen vorzugehen und erobert als nächstes den Weltraum. Dazu später mehr.

### Start
Meine Idee für einen Start ist, dass ich als Einzeller starte mir neue Futterstellen zu suchen, die verschiedene Auswahlparameter haben. Dazu später. Das Ganze muss nicht grafisch aufwändig sein, wie man es von Idle-Games kennt.

## Lose Ideensammlung
Du hast Eier. 

Du bist an einer Nahrungsquelle. 

Klick auf die Nahrungsquelle gibt Nahrung 

Mit Nahrung und Eiern können Drohnen gekauft werden, die Nahrung sammeln (aber weniger als Klicks geben) 

oder Soldaten, die die Verteidigung übermannen können 

oder Königinnen, die Eier legen und in Transporter umgewandelt werden können 

Nahrungsquellen werden aufgebraucht (kleine Ascension / kleiner Aufstieg) und der Schwarm muss weiterziehen 

Dabei gibt es verschiedene Faktoren zu beachten:  

- Größe der Nahrungsquelle 
- Distanz zur Nahrungsquelle 
    - Der eigene Radius bestimmt zunächst einfach über die Auswahl 
- Verteidigungsfähigkeit der Nahrungsquelle 
    - Höhere Verteidigung = mehr DNA 

Eier sind die Basis für den Schwarm: aus ihnen schlüpfen alle anderen Einheiten. (Alles ist eine Einheit, von der Drohne bis zum Transporter ist alles biologisch.) 

Mit DNA können Upgrades für den Schwarm gekauft werden (genetische Adaption) die das Sammeln der Nahrung effizienter machen oder die Krieger stärker 

Drohnen sammeln Nahrung, je mehr und je besser die Drohnen sind, desto schneller ist eine Nahrungsquelle aufgebraucht und man kann weiter zur nächsten. Um Drohnen zu erzeugen braucht man Eier. 

Soldaten übermann die Verteidigung einer Nahrungsquelle. Die Entscheidung ist binär: entweder man kann eine Nahrungsquelle einnehmen oder nicht. Um Soldaten zu erzeugen braucht man Eier. 

Wenn man eine Nahrungsquelle eingenommen hat verliert man dabei Soldaten. Mit Upgrades kann das Fleisch der gefallenen Soldaten wieder als Nahrung dienen. 

Königinnen legen Eier, aus denen Drohnen, Soldaten und weitere Königinnen schlüpfen können. Dafür brauchen Königinnen Nahrung. 

An Nahrungsquellen können zufällig Upgrades gefunden werden; das können: 

- Boni sein, die sofort gelten 
- einzigartige Upgrades sein, die nur so freigeschaltet werden können 
- oder Collectibles für Badges 

Transporter bringen den Schwarm zur nächsten Nahrungsquelle (kleine Ascension) - werden aus Königinnen entwickelt, verbrauchen sie also. Transporter bleiben erhalten und ermöglichen so, dass der Schwarm immer größer wird. 

Kleine Ascension = von einer Nahrungsquelle zur Nächsten (s.o.) 

Große Ascension = auf die nächste Stufe: vom Einzeller zum Mehrzeller, an Land, usw.

Eier sind nur ein Begriff im Spiel, keine Entität. 

Die Königinnen erzeugen direkt aus Eiern die Einheiten.

---

1. Einzeller in der Ursuppe ziehen über Schlote, Algenvorkommen, Kadaver größerer Tiere (wie Walstürze) etc. 
2. Fische und andere im Urmeer ziehen durch Seetangwälder, Riffe, Meeresgräben, Gruppen von Schwarmtieren, Strand- und Inselregionen, etc. 
3. Landtiere ziehen durch Felder, Wälder, Bergregionen, Dörfer, Städte 
    1. ggf. später ganze Länder - ist das eine eigene Ascension? 
4. Schwarmflotten ziehen über Planeten (versch. Klassen wie Felsplaneten, Eisplaneten, Erden, Gasriesen, …) und ggf. große Weltraumstationen 
    1. und dann von zwischen einzelnen Systemen hin- und her - ist das eine eigene Ascension oder ist das erste System eher eine Art Tutorial in dem man FTL-Tech findet und dann geht es richtig los? 
    2. ab einer gewissen Größe wählt man keine einzelnen Planeten im System mehr sondern nur noch die gesamten Systeme 
5. Ab da kann es dann beliebig groß weitergehen: sehr große Ascension zur nächsten Galaxis usw.

---

1. Um von Nahrungsquelle zu Nahrungsquelle zu ziehen folgen die Einheiten den Königinnen. 
2. Jeder Königin kann nur eine bestimmte Menge Einheiten folgen. 
3. Wenn zu wenig Königinnen da sind um den gesamten Schwarm zu transportieren gibt es folgende Möglichkeiten: 
    1. Man opfert Drohnen, um aus der gewonnenen Nahrung neue Königinnen zu züchten 
    2. Man nimmt priorisiert entweder mit Fokus auf Drohnen oder Soldaten mit und lässt den Rest zurück 
    3. Man nimm ausgewogen im prozentualen Verhältnis der Drohnen/Soldaten mit und lässt den Rest zurück 
4. Man muss eine Nahrungsquelle natürlich nicht aufbrauchen um weiterzuziehen, das geht jederzeit

Später kommen ggf. weitere Eigenschaften, wie unterschiedliche Arten von Verteidigung dazu. 

Vielleicht braucht der Schwarm später für manche Sachen auch andere Rohstoffe, die nicht über organische Nahrung aufgenommen werden können - bspw. Für die Bildung von Schalen/Panzern o. Ä.

TODO: Brauchen Königinnen für Drohnen, Soldaten und andere Königinnen dieselbe Menge Nahrung?

Wenn man eine neue Nahrungsquelle eingenommen hat muss man sich überlegen, wie man mit den Ressourcen umgeht: 

- Erzeugt man viele Drohnen, so kann man schnell sammeln, ist aber limitiert bei der Erschließung neuer Nahrungsquellen 
- Erzeugt man viele Soldaten so kann man schnell neue Nahrungsquellen erschließen aber weniger schnell sammeln (könnte aber von Vorteil sein, wenn man viele Upgrades findet) 

Wenn man aktiv spielt kauft man selbst neue Einheiten (Drohnen, Soldaten, Königinnen) und sie werden selbstverständlich passiv erzeugt (Drohnen, Soldaten). 

Da Drohnen und Soldaten dieselbe Ressource (Eier) benötigen muss man im Verhältnis festlegen, wie sie erzeugt werden. Das tut man über Zugabe oder Wegnahme von %EINHEIT%. 

 Für %EINHEIT% stelle ich mir ein ähnliches System vor, wie das Levelsystem bei Baldurs Gate: Das Verhältnis der Punkte sagt etwas aus - ich erhöhe aber auch die Gesamtzahl und damit die Stärke insgesamt und nicht nur das Verhältnis. Die Gesamtzahl sagt dabei aus wie schnell ich neue Einheiten erzeuge und das Verhältnis bestimmt… das Verhältnis. 

Das Verhältnis der Punkte von %EINHEIT% kann ich nachträglich jederzeit anpassen, um Idle defensiver oder aggressiver zu spielen. 

Idee für %EINHEIT%: Pheromone 

Der Idle-Part: wenn ich nicht aktiv spiele so sammelt der Schwarm einfach immer weiter Nahrung, erzeugt nach dem über %EINHEIT% festgelegten Schema neue Einheiten und zieht nach einer vorher festgelegten Strategie von Nahrungsquelle zu Nahrungsquelle. 

Strategie wird vom Nutzer festgelegt: 

- Weg des geringsten Widerstands: die Nahrungsquelle mit der niedrigsten Verteidigung 
- Kampfgehärtet: die Nahrungsquelle mit dem höchsten Widerstand 
- Ausgewogen 
- ???

Die einzelnen Ascensions könnten auch in Biome untergliedert sein: 

- Meeresgrund = Walstürze, Schlote, … 
- Offenes Meer = Gruppen von Tieren, Seetangwälder 
- Küstenregionen und Gräben uvm. 

- Wüste, Savanne, Wald, Sumpf, ländliche Region (Dörfer und Felder), Metropolregion 

- Sonnensysteme = eigene Region? 
- Sternenbilder, Nebel, … 

- Lokale Gruppen, Galaxien-Cluster, ...

---

Upgrades lassen den Schwarm schneller wachsen; mehr Nahrung lässt ihn größer wachsen

Ich laufe hier in ein Problem: Wenn die Soldaten bei Eroberung verbraucht werden und %EINHEIT% die Produktionsrate erhöht dann werden es immer weniger Soldaten?! 

Oder das ist kein Problem, sondern ein Feature: ich muss selbst herausfinden und immer wieder nachjustieren, dass ich genug Soldaten habe… ggf. ist es dann sogar besser mehr Soldaten nachzuproduzieren, da sie ja regelmäßig verbraucht werden. 

Wie verhindere ich, dass der Spieler hinterher keine Soldaten mehr hat und nicht mehr weiter kommt? Möglichkeiten: 

1. Ich habe eine Art "Umtauschfunktion": ich kann jederzeit Drohnen (mit Umwandlungsverlust) zu Nahrung machen, um neue Eier zu legen, aus denen dann Soldaten schlüpfen. Mit Upgrades kann ich den Verlust verringern, sodass ich flexibler werde. Dauert aber alles seine Zeit bis aus der Nahrung neue Einheiten gewachsen sind. 
    
    - Da brauche ich aber immer noch Balancing: ich könnte Drohnen mit Verlust opfern um neue Drohnen zu haben  bis das Spiel vorbei ist, weil ich keine Ziele mehr anfliegen kann… 
        
2. Drohnen sind Pluripotent: Ich kann Drohnen direkt zu Soldaten machen - das ist aber Scheiße, weil ich dann alles auf Drohnen setzen kann und vorm Weiterziehen einfach ein paar in Soldaten wandle. Das ginge aber nicht passiv. Hmmm… 
    
3. Balancing: Ich habe beim Weiterziehen immer ein Gebiet mit Verteidigung=0 dabei, was als einfache Rohstoffquelle taugt an der ich meine Produktion umstellen kann. Habe ich falsch geskillt dann dauert es natürlich lange wieder richtig weiterzumachen - ist also eine Bestrafung für falsches skillen

---

Entitäten 

Währungen 
- Nahrung 
- Erbgut/DANN 
- Pheromone 

Einheiten 
- Königinnen 
    - Produktionsgeschwindigkeit 
    - Produktionsverhältnis 
    - Transportkapazität 
    - Reichweite 
- Drohnen 
    - Abbaugeschwindigkeit 
    - Umwandlungsverlust für  
        - Soldaten 
        - Königinnen 
    - Platzverbrauch ( = 1 ) 
- Soldaten 
    - Angriffsstärke 
    - Platzverbrauch ( = P ) 

Aktionen 
- Klick (auf Nahrungsquelle) 
- Einheiten kaufen 
    - Drohnen 
    - Soldaten 
    - Königinnen 
- Upgrades kaufen 
    - Für Produktion von… 
- Pheromone verteilen 
- Zur nächsten Nahrungsquelle ziehen 
    - Auswahl der Nahrungsquelle 
    - Direktumwandlung von Drohnen in Königinnen für Transport 
- Drohnen opfern 

Idle-Prozesse 
- Abbau von Nahrung 
- Erzeugung neuer Einheiten 
    - Drohnen 
    - Soldaten 
- Weiterziehen gemäß Strategie

