# A. Pregled aktivnosti grupe

**Cilj:** Prikazati kako je tim organizirao projekt, raspodijelio rad, reagirao na važne probleme i pridonio rezultatu. Zapisi trebaju opisivati ishode, a ne samo navoditi da je sastanak održan ili da se o nekoj temi raspravljalo.

## A.1 Evidencija sastanaka

**Cilj:** Voditi kratak zapis projektnih sastanaka i tjedne koordinacije: tko je sudjelovao, što je odlučeno i koja je radnja uslijedila. Raspravu koja nije dovela do odluke zabilježite samo ako je važno pitanje ostalo otvoreno.

Kratice: `PK` = Pavao Knez; `VL` = Viktor Lazić; `AW` = Adam Winkler; `LD` = Lukas Davorija; `MM` = Matej Miličević; `PS` = Patrik Šinko; `LZ` = Leon Zorko.

| Datum i sudionici | Glavna tema | Donesena odluka ili zadatak | Poveznica na zadatak ili rezultat, ako postoji |
| --- | --- | --- | --- |
| 24.10.2026.; svi članovi | Dogovor 3. tjedan | Aw treba maknuti da netko može biti ovlašteni predstavnik pravne osobe Dodati meeting-notes na Github | [bilješke](meeting-notes/24-10-2026 m2.md) |
| 11.11.2026.; svi članovi | Dogovor 6. tjedan | tjedan 6. treba dovršiti autorizaciju kreiranje oglasa za najam odabran kao jedna domenski relevantna funkcionalnost. | [bilješke](meeting-notes/11-11-2026 m2.md) |
| 15.11.2026.; svi članovi | Sastanak prije labosa | Ispolirati sve da bude spremno za predaju. Pitanja za asistenta | [bilješke](meeting-notes/15-11-2026 m2.md) |
| 16.11.2026.; svi članovi | Sastanak nakon labosa | Nakon labosa. Migracija se nije pokretala automatski na neonu: rijesili problem dodavanjem migracije ispred pokretanja u renderu (komanda) | [bilješke](meeting-notes/16-11-2026 m2.md) |

## A.2 Plan rada

**Cilj:** Prikazati planirani redoslijed rada i odgovornosti u timu. Prikažite projektne tjedne ili druga kratka razdoblja koja tim koristi, uključujući pripremu za formalne provjere.

**Trenutačni plan:** Zadaci se vode u [Jiri](https://trade-it.atlassian.net/jira/software/projects/SCRUM/boards/1?filter=&groupBy=none) te svaki član ima zadane zadatke po tjednu u kojem je potreban.

| Razdoblje/Tjedan | Glavni planirani rad | Odgovorni članovi |
| --- | --- | --- |
| 5. tjedan (28.10. – 8.11.) | Postavljanje baze podataka, uspostava git standarda, definiranje API ugovora, razrada obrasca uporabe | LZ, PS, MM, LD | 
| 6. tjedan (7.11. – 15.11.) | API za pretragu i filtriranje, implementacija autentifikacije i OAuth prijave, definiranje modela podataka, priprema sučelja za testiranje | VL, PK, MM, LD, PS, AW |
| 16.11. – prva predaja | Izrada dijagrama, javno postavljanje | LZ, PK, MM | 


## A.3 Aktivnosti i doprinosi članova

**Cilj:** Prikazati koji su članovi radili na važnim projektnim aktivnostima i približan trud koji prijavljuju. Uz implementaciju uključite oblikovanje, dokumentaciju, integraciju, ispitivanje i postavljanje.

| Aktivnost ili rezultat | Član | Prijavljeni sati |
| --- | --- | --- |
|  | Pavao Knez |  |
| Izrada API-ja za pretragu i filtriranje | Viktor Lazić | 20 |
|  | Adam Winkler |  |
|  | Lukas Davorija |  |
|  | Matej Miličević |  |
|  | Patrik Šinko |  |
| Izrada i ažuriranje dokumentacije. Izlučivanje zahtjeva. Izrada obrasca uporabe te dijagrama uporabe i razreda | Leon Zorko | 30 |




## A.4 Pregled promjena u repozitoriju

**Cilj:** Prikazati kada su promjene napravljene u repozitoriju i tko ih je napravio, uz napomenu da sam broj zapisa promjena ne mjeri kvalitetu doprinosa.

**Prikaz aktivnosti repozitorija:** [GitHub Contributors](https://github.com/tradeit-fer/rentit/graphs/contributors) za cijelo trajanje projekta.

GitHub Contributors prikazuje promjene samo glave grane te može prikazivati krivo ukoliko je spojeno preko Pull Requesta moguće je da je dio tuđeg rada zapisano onome koji je spojio promjene. 


## A.5 Ključni inženjerski izazovi i rješenja

**Cilj:** Dokumentirati stvarne tehničke i organizacijske prepreke s kojima se tim suočio, poduzete korektivne inženjerske korake te konačni ishod. Odaberite konkretne izazove umjesto općenite pohvale timskog rada.

| Izazov | Poduzeta radnja | Ishod ili preostalo ograničenje |
| --- | --- | --- |
|  |  |  |

<details>
<summary><strong>Rješavanje nesklada formata lokacije</strong></summary>

**Primjer — CrisisMap:**

| Izazov | Poduzeta radnja | Ishod ili preostalo ograničenje |
| --- | --- | --- |
| Odabrani položaj na karti prikazivao se u klijentu, ali podnesena prijava nije zadržavala koordinate. | AK i EP usporedile su zahtjev preglednika s poljima lokacije koje očekuje API; AK je uskladila format zahtjeva, a LM je dodao provjeru valjanosti lokacije. | Nova prijava u ovom se scenariju može dohvatiti sa spremljenim položajem; tim povezuje odgovarajuću promjenu integracije i provjeru. |

**Problem, odgovor i ishod:** Svaki se dio može provjeriti u projektu. Rečenica poput „imali smo poteškoće s integracijom i riješili ih timskim radom” ne bi čitatelju rekla što nije radilo ni kako je rješenje promijenjeno.

</details>

---

>**Završna provjera:** Sastanci navode smislene ishode i odgovorne osobe; plan odražava namjeravani rad; tablica uloženog rada i generirani prikaz repozitorija odnose na ovaj vidljivi projekt; konkretni izazovi povezani su s radnjama i njihovim rezultatima. 
