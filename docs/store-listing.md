# Store listing (Poki)

What Poki for Developers asks for when the game is added, ready to paste. The pictures are made from the game (M12),
both tools need `npm run dev`, and everything lands in `release/poki-submission/`:

| File | For | Spec | Made by |
|---|---|---|---|
| `thumbnail-minigun-1080.png`, `-628.png` | Static thumbnail, candidate A (needed before the Player Fit Test) | Square, full-bleed, no text, no HUD, at least 628 px | `npm run thumbs` |
| `thumbnail-ox-1080.png`, `-628.png` | Static thumbnail, candidate B | the same | `npm run thumbs` |
| `thumbnail-hover.mp4` | Animated (hover) thumbnail | 1080 × 1080, 30 fps, 6 s, muted, H.264 | `npm run thumbs -- hover` |
| `screenshot-1-wave.png` … `screenshot-5-ending.png` | Screenshots, if asked | 1280 × 720 with the HUD | `node tools/qa/store-shots.mjs` |

- **Candidate A** (recommended): the hero from behind his shoulder, the gold minigun blazing, brass flying, a crowd of
  the Baron's peasants and footmen charging up the hill at him. It says "you, a gun, an army" at a glance.
- **Candidate B:** the hero facing the Iron Ox under the Iron Keep, its horns aglow, the Baron in his turret, the fire
  marked on the grass. The boss and the castle make it the more striking, but it says less about the game's loop.
- **The video:** candidate A in motion: he sweeps the minigun across the block as it charges and tumbles, the camera
  pushing gently in.
- **Screenshots:** a wave up close with the machine gun, the Iron Ox fight with its boss bar, Rosie's shop, the map
  with Queen Ada's line, and the ending.

## Name

**Thunder Knight** (the working title, free of clashes when checked on 2026-11-04; the owner confirms the final store
title at upload, `docs/vision.md` §8). Never "Knight Makers", the folder's name.

## Category ideas

Main genre: **Shooting Games**. Also: Action, Strategy (the army and the shop between waves), 3D. Both mobile
orientations.

## English

**One line:** Hold the Queen's banner with modern guns against a medieval army.

**Description:** A storm rift has dropped you and Rosie's pickup truck into Larkmoor, right in the path of the Iron
Baron's army. Stand by Queen Ada's banner and hold the line with modern guns: knock out peasants, footmen and knights,
down their captains to send whole squads running, and scoop up the gold they drop. Between waves, Rosie sells
shotguns, machine guns, a minigun and rockets, better boots and armour, and soldiers of your own: militia, archers,
men-at-arms and knights. Twenty battles in four regions, bosses like Sir Grudge, the War Wagon and the Iron Ox, then
endless Last Stand waves. Cartoon, bloodless fun, with aim help and auto-fire on phones.

**Controls, desktop:** WASD or arrows to move, mouse to aim, click to shoot. R reloads, X or the wheel swaps guns,
G throws a grenade, E calls support, Enter starts the next wave, Esc pauses.

**Controls, touch:** drag on the left to move, drag on the right to aim. Your gun fires by itself when it's on an
enemy. Buttons for grenades, support and your second gun appear as you earn them.

## Français

**En une ligne :** Défends la bannière de la reine avec des armes modernes face à une armée médiévale.

**Description :** Une faille dans la tempête t'a déposé, avec le pick-up de Rosie, à Larkmoor, pile sur le chemin de
l'armée du Baron de Fer. Tiens bon près de la bannière de la reine Ada avec des armes modernes : mets K.-O. paysans,
fantassins et chevaliers, abats leurs capitaines pour faire fuir des escouades entières et ramasse l'or qu'ils
lâchent. Entre les vagues, Rosie vend fusils à pompe, mitrailleuses, minigun et roquettes, bottes et armure, et des
soldats bien à toi : milice, archers, hommes d'armes et chevaliers. Vingt batailles dans quatre régions, des boss
comme Sir Grudge, le Chariot de guerre et le Bœuf de fer, puis les vagues sans fin du Dernier rempart. Un jeu
cartoon, sans sang, avec aide à la visée et tir automatique sur mobile.

**Commandes, ordinateur :** ZQSD ou flèches pour bouger, souris pour viser, clic pour tirer. R recharge, X ou la
molette change d'arme, G lance une grenade, E appelle un renfort, Entrée lance la vague suivante, Échap met en pause.

**Commandes, tactile :** glisse à gauche pour bouger, à droite pour viser. Ton arme tire toute seule quand elle vise
un ennemi. Les boutons de grenade, de renfort et de deuxième arme apparaissent quand tu les gagnes.

## Italiano

**In una riga:** Difendi lo stendardo della regina con armi moderne contro un esercito medievale.

**Descrizione:** Un varco nella tempesta ha portato te e il furgone di Rosie a Larkmoor, proprio sulla strada
dell'esercito del Barone di Ferro. Resta accanto allo stendardo della regina Ada e tieni la linea con armi moderne:
metti K.O. contadini, fanti e cavalieri, abbatti i loro capitani per mettere in fuga intere squadre e raccogli l'oro
che lasciano. Tra un'ondata e l'altra Rosie vende fucili a pompa, mitragliatrici, minigun e razzi, stivali e
armature, e soldati tutti tuoi: milizia, arcieri, uomini d'arme e cavalieri. Venti battaglie in quattro regioni, boss
come Sir Grudge, il Carro da guerra e il Bue di ferro, poi le ondate infinite dell'Ultima difesa. Divertimento in
stile cartone, senza sangue, con aiuto mira e fuoco automatico su telefono.

**Comandi, computer:** WASD o frecce per muoverti, mouse per mirare, clic per sparare. R ricarica, X o la rotellina
cambia arma, G lancia una granata, E chiama il supporto, Invio avvia l'ondata successiva, Esc mette in pausa.

**Comandi, touch:** trascina a sinistra per muoverti, a destra per mirare. L'arma spara da sola quando è su un nemico.
I pulsanti per granate, supporto e seconda arma compaiono man mano che li ottieni.

## Deutsch

**In einer Zeile:** Verteidige das Banner der Königin mit modernen Waffen gegen eine mittelalterliche Armee.

**Beschreibung:** Ein Sturmriss hat dich und Rosies Pick-up nach Larkmoor geworfen, mitten in den Weg der Armee des
Eisernen Barons. Halte am Banner von Königin Ada die Stellung mit modernen Waffen: Schalte Bauern, Fußsoldaten und
Ritter aus, besiege ihre Hauptleute, damit ganze Trupps fliehen, und sammle ihr Gold ein. Zwischen den Wellen verkauft
Rosie Schrotflinten, Maschinengewehre, eine Minigun und Raketen, Stiefel und Rüstung und eigene Soldaten: Miliz,
Bogenschützen, Waffenknechte und Ritter. Zwanzig Schlachten in vier Regionen, Bosse wie Sir Grudge, der Kriegswagen und
der Eiserne Ochse, danach endlose Wellen im Letzten Gefecht. Comic-Spaß ohne Blut, mit Zielhilfe und Autofeuer auf dem
Handy.

**Steuerung, Computer:** WASD oder Pfeiltasten zum Bewegen, Maus zum Zielen, Klick zum Schießen. R lädt nach, X oder
das Mausrad wechselt die Waffe, G wirft eine Granate, E ruft Verstärkung, Enter startet die nächste Welle, Esc pausiert.

**Steuerung, Touch:** links ziehen zum Bewegen, rechts ziehen zum Zielen. Deine Waffe feuert von selbst, wenn sie auf
einem Gegner liegt. Knöpfe für Granaten, Verstärkung und die zweite Waffe erscheinen, sobald du sie freischaltest.

## Español

**En una línea:** Defiende el estandarte de la reina con armas modernas contra un ejército medieval.

**Descripción:** Una grieta en la tormenta te ha dejado, junto a la camioneta de Rosie, en Larkmoor, justo en el camino
del ejército del Barón de Hierro. Quédate junto al estandarte de la reina Ada y aguanta la línea con armas modernas:
derriba a campesinos, infantes y caballeros, tumba a sus capitanes para que escuadras enteras huyan y recoge el oro que
sueltan. Entre oleadas, Rosie vende escopetas, ametralladoras, una minigun y cohetes, botas y armadura, y soldados
propios: milicia, arqueros, hombres de armas y caballeros. Veinte batallas en cuatro regiones, jefes como Sir Grudge,
el Carro de guerra y el Buey de hierro, y después las oleadas sin fin de la Última resistencia. Diversión de dibujos
animados, sin sangre, con ayuda al apuntar y disparo automático en el móvil.

**Controles, ordenador:** WASD o flechas para moverte, ratón para apuntar, clic para disparar. R recarga, X o la rueda
cambia de arma, G lanza una granada, E pide apoyo, Intro empieza la siguiente oleada, Esc pausa.

**Controles, táctil:** arrastra a la izquierda para moverte y a la derecha para apuntar. Tu arma dispara sola cuando
apunta a un enemigo. Los botones de granadas, apoyo y segunda arma aparecen cuando los consigues.

## Português

**Em uma linha:** Defenda o estandarte da rainha com armas modernas contra um exército medieval.

**Descrição:** Uma fenda na tempestade jogou você e a caminhonete da Rosie em Larkmoor, bem no caminho do exército do
Barão de Ferro. Fique ao lado do estandarte da rainha Ada e segure a linha com armas modernas: derrube camponeses,
infantes e cavaleiros, acerte os capitães para fazer esquadrões inteiros fugirem e junte o ouro que eles deixam cair.
Entre as ondas, a Rosie vende escopetas, metralhadoras, minigun e foguetes, botas e armadura, e soldados só seus:
milícia, arqueiros, homens de armas e cavaleiros. Vinte batalhas em quatro regiões, chefes como Sir Grudge, a Carroça
de guerra e o Boi de ferro, e depois as ondas sem fim da Última resistência. Diversão de desenho animado, sem sangue,
com ajuda na mira e tiro automático no celular.

**Controles, computador:** WASD ou setas para andar, mouse para mirar, clique para atirar. R recarrega, X ou a
rodinha troca de arma, G joga uma granada, E chama apoio, Enter começa a próxima onda, Esc pausa.

**Controles, toque:** arraste à esquerda para andar e à direita para mirar. Sua arma atira sozinha quando está num
inimigo. Os botões de granada, apoio e segunda arma aparecem conforme você os ganha.

## Türkçe

**Tek satırda:** Kraliçenin sancağını modern silahlarla ortaçağ ordusuna karşı koru.

**Açıklama:** Bir fırtına yarığı seni ve Rosie'nin kamyonetini Larkmoor'a, Demir Baron'un ordusunun tam önüne bıraktı.
Kraliçe Ada'nın sancağının yanında dur ve modern silahlarla hattı tut: köylüleri, piyadeleri ve şövalyeleri nakavt et,
kaptanlarını indirip bütün birlikleri kaçır, düşürdükleri altını topla. Dalgaların arasında Rosie pompalı tüfekler,
makineli tüfekler, minigun ve roketler, çizme ve zırh, ayrıca sana ait askerler satar: milisler, okçular, zırhlı
askerler ve şövalyeler. Dört bölgede yirmi savaş, Sir Grudge, Savaş Arabası ve Demir Öküz gibi patronlar, ardından Son
Direniş'in sonsuz dalgaları. Kansız, çizgi film tadında eğlence; telefonda nişan yardımı ve otomatik ateş.

**Kontroller, bilgisayar:** Hareket için WASD veya ok tuşları, nişan için fare, ateş için tıkla. R şarjör değiştirir,
X veya tekerlek silah değiştirir, G bomba atar, E destek çağırır, Enter sonraki dalgayı başlatır, Esc duraklatır.

**Kontroller, dokunmatik:** hareket için solda, nişan için sağda sürükle. Silahın bir düşmana dönükken kendiliğinden
ateş eder. Bomba, destek ve ikinci silah düğmeleri kazandıkça çıkar.

## Русский

**В одной строке:** Защити знамя королевы современным оружием от средневековой армии.

**Описание:** Грозовой разлом забросил тебя вместе с пикапом Рози в Ларкмур, прямо на пути армии Железного барона.
Встань у знамени королевы Ады и держи оборону современным оружием: отправляй в нокаут крестьян, пехотинцев и рыцарей,
сбивай их капитанов, чтобы целые отряды бежали, и собирай выпавшее золото. Между волнами Рози продаёт дробовики,
пулемёты, миниган и ракеты, сапоги и броню, а ещё твоих собственных солдат: ополчение, лучников, латников и рыцарей.
Двадцать битв в четырёх краях, боссы вроде сэра Груджа, Боевой повозки и Железного быка, а потом бесконечные волны
Последнего рубежа. Мультяшное веселье без крови, с помощью в прицеливании и автоогнём на телефоне.

**Управление, компьютер:** WASD или стрелки — движение, мышь — прицел, клик — выстрел. R — перезарядка, X или колесо —
смена оружия, G — граната, E — поддержка, Enter — следующая волна, Esc — пауза.

**Управление, сенсор:** веди слева, чтобы двигаться, справа, чтобы целиться. Оружие стреляет само, когда наведено на
врага. Кнопки гранат, поддержки и второго оружия появляются, когда ты их получаешь.

## 简体中文

**一句话：** 用现代枪械守护女王的军旗，迎战中世纪大军。

**简介：** 一道风暴裂隙把你和罗西的皮卡一起丢进了拉克摩尔，正好挡在钢铁男爵的大军面前。守在艾达女王的军旗旁，用现代枪械守住防线：击倒农民、步兵和骑士，打倒他们的队长让整支队伍溃逃，再捡起他们掉落的金币。每波之间，罗西会出售霰弹枪、机枪、加特林和火箭，还有靴子、护甲，以及属于你自己的士兵：民兵、弓箭手、重甲兵和骑士。四大地区二十场战斗，格拉奇爵士、战车、铁牛等首领等你挑战，之后还有无尽波次的最后防线。卡通风格、没有流血，手机上有瞄准辅助和自动射击。

**操作（电脑）：** WASD 或方向键移动，鼠标瞄准，点击射击。R 换弹，X 或滚轮切换武器，G 扔手雷，E 呼叫支援，回车开始下一波，Esc 暂停。

**操作（触屏）：** 在左侧拖动来移动，在右侧拖动来瞄准。准星对准敌人时会自动开火。手雷、支援和第二把枪的按钮会在你获得后出现。

## 日本語

**ひとことで：** 現代の銃で女王の旗を守れ、相手は中世の大軍だ。

**説明：** 嵐の裂け目に飲まれたあなたとロージーのピックアップトラックが落ちたのは、ラークムーア。しかも鉄の男爵の軍勢の真ん前です。エイダ女王の旗のそばに立ち、現代の銃で戦線を守りましょう。農民、歩兵、騎士をノックアウトし、隊長を倒せば部隊ごと逃げ出し、落としたゴールドを拾えます。ウェーブの合間には、ロージーがショットガン、マシンガン、ミニガン、ロケット、ブーツや防具、そしてあなたの兵士（民兵、弓兵、重装兵、騎士）を売ってくれます。4つの地方で20のバトル、グラッジ卿や戦闘馬車、鉄の牛などのボス、その先には終わらないウェーブのラストスタンド。血の出ないカートゥーン調で、スマホではエイムアシストとオート射撃つき。

**操作（パソコン）：** WASDか矢印キーで移動、マウスでねらい、クリックで射撃。Rでリロード、Xかホイールで武器の持ち替え、Gでグレネード、Eでサポート、Enterで次のウェーブ、Escでポーズ。

**操作（タッチ）：** 左側をドラッグで移動、右側をドラッグでねらう。敵に照準が合うと自動で撃ちます。グレネード、サポート、2つ目の銃のボタンは手に入れると現れます。

## 한국어

**한 줄 소개:** 현대식 총으로 중세 대군에 맞서 여왕의 깃발을 지켜라.

**설명:** 폭풍 속 균열이 당신과 로지의 픽업트럭을 라크무어로 떨어뜨렸습니다. 하필이면 강철 남작의 군대가 지나가는 길목입니다. 에이다 여왕의 깃발 곁에 서서 현대식 총으로 전선을 지키세요. 농민, 보병, 기사를 쓰러뜨리고, 대장을 쓰러뜨려 부대 전체를 도망치게 하고, 떨어진 골드를 주우세요. 웨이브 사이에는 로지가 샷건, 기관총, 미니건, 로켓, 부츠와 갑옷, 그리고 당신만의 병사(민병대, 궁수, 중갑병, 기사)를 팝니다. 네 지역의 스무 번의 전투, 그러지 경과 전투 마차, 강철 황소 같은 보스, 그 뒤에는 끝없는 웨이브의 최후의 저항이 기다립니다. 피 없는 만화풍 재미, 휴대폰에서는 조준 보조와 자동 사격까지.

**조작(컴퓨터):** WASD나 방향키로 이동, 마우스로 조준, 클릭으로 사격. R 재장전, X나 휠로 무기 교체, G 수류탄, E 지원 요청, Enter 다음 웨이브, Esc 일시정지.

**조작(터치):** 왼쪽을 드래그해 이동하고 오른쪽을 드래그해 조준하세요. 적을 겨누면 총이 알아서 쏩니다. 수류탄, 지원, 두 번째 총 버튼은 얻는 대로 나타납니다.
