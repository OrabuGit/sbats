# Rank stability: does the top ten depend on the exact weights?

Written 2026-11-15T06:50:09.419Z by `npx tsx validation/stability.ts`. Score frozen 2026-11-14; nothing here changes it.

Method: 200 redraws of the Base weights with seed 20261115. In each, every weight is multiplied by a random factor between 0.75 and 1.25, the six are renormalised to sum to 1, and all 91894 Earth cells are scored again with the frozen formula. No redraw is kept.

| Target | Top 10 that stays in the top 10, on average | In the worst redraw | Widest rank range among the top 10 |
| --- | --- | --- | --- |
| moon-malapert-massif | 90% | 70% | rank 4 moved between 2 and 16 |
| moon-mons-mouton | 83% | 70% | rank 8 moved between 2 and 44 |
| moon-haworth | 88% | 50% | rank 2 moved between 1 and 19 |
| moon-shackleton-rim | 88% | 70% | rank 10 moved between 3 and 38 |
| moon-marius-hills | 91% | 70% | rank 10 moved between 9 and 23 |
| mars-jezero | 85% | 50% | rank 10 moved between 7 and 62 |
| mars-gale | 81% | 60% | rank 7 moved between 2 and 47 |
| mars-arcadia-planitia | 84% | 60% | rank 6 moved between 4 and 32 |

Reading: the list of the best ten cells is mostly the same whatever the weights within a quarter of the preset. Single ranks inside it are not fixed: say "among the ten best", not "the third best".

## Known analogs and candidates: how far their rank moves

Rank among all scored Earth cells with the frozen weights, and the range that nine redraws in ten fall into.

| Target | Site | Kind | Rank | Nine in ten redraws | Beats this share of cells |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | mauna-kea | known | 58397 | 57235 to 59259.1 | 37% |
| moon-malapert-massif | kilauea | known | 56030 | 54409.6 to 57559.3 | 39% |
| moon-malapert-massif | lanzarote-timanfaya | known | 19290 | 16168.4 to 22689.4 | 79% |
| moon-malapert-massif | ries-crater | known | 48190 | 47373.1 to 48936.5 | 48% |
| moon-malapert-massif | askja | known | 14036 | 9854 to 17358.4 | 85% |
| moon-malapert-massif | sp-crater | known | 19703 | 19357.5 to 20433.7 | 79% |
| moon-malapert-massif | meteor-crater | known | 15263 | 13666.7 to 16955.2 | 83% |
| moon-malapert-massif | etna | known | 43717 | 43046.9 to 44486.4 | 52% |
| moon-malapert-massif | sudbury | known | 44102 | 43571.9 to 44609.1 | 52% |
| moon-malapert-massif | mistastin-crater | known | 25801 | 21396.6 to 29650.5 | 72% |
| moon-malapert-massif | id-kawah-ijen | candidate | 60792 | 60714.7 to 60864.1 | 34% |
| moon-malapert-massif | id-merapi | candidate | 63495 | 63207.4 to 63609.5 | 31% |
| moon-malapert-massif | id-gua-lawa | candidate | 63687 | 63448.9 to 63776.2 | 31% |
| moon-malapert-massif | id-goa-pandan | candidate | 62374 | 62055.9 to 62592.2 | 32% |
| moon-malapert-massif | id-kesaksak-lava-tube | candidate | 61169 | 61006 to 61367.2 | 33% |
| moon-malapert-massif | id-maros-pangkep-karst | candidate | 62030 | 61859.8 to 62163.2 | 33% |
| moon-malapert-massif | id-tambora-caldera | candidate | 59183 | 58764.3 to 59584.6 | 36% |
| moon-malapert-massif | id-batur-lava-fields | candidate | 61169 | 61006 to 61367.2 | 33% |
| moon-mons-mouton | mauna-kea | known | 58285 | 57114.6 to 59168.7 | 37% |
| moon-mons-mouton | kilauea | known | 55785 | 54171.8 to 57379.7 | 39% |
| moon-mons-mouton | lanzarote-timanfaya | known | 18977 | 15869.9 to 22345.7 | 79% |
| moon-mons-mouton | ries-crater | known | 48180 | 47382.3 to 48931.2 | 48% |
| moon-mons-mouton | askja | known | 13480 | 9327.2 to 16787 | 85% |
| moon-mons-mouton | sp-crater | known | 19275 | 18868.8 to 20105.3 | 79% |
| moon-mons-mouton | meteor-crater | known | 15036 | 13271.6 to 16739.9 | 84% |
| moon-mons-mouton | etna | known | 43356 | 42499.8 to 44193.2 | 53% |
| moon-mons-mouton | sudbury | known | 44125 | 43586.2 to 44617 | 52% |
| moon-mons-mouton | mistastin-crater | known | 25680 | 21343 to 29544.7 | 72% |
| moon-mons-mouton | id-kawah-ijen | candidate | 60722 | 60635.7 to 60807.1 | 34% |
| moon-mons-mouton | id-merapi | candidate | 63469 | 63167.9 to 63594.4 | 31% |
| moon-mons-mouton | id-gua-lawa | candidate | 63654 | 63409 to 63757.3 | 31% |
| moon-mons-mouton | id-goa-pandan | candidate | 62399 | 62068 to 62606.1 | 32% |
| moon-mons-mouton | id-kesaksak-lava-tube | candidate | 61118 | 60960.5 to 61310.5 | 34% |
| moon-mons-mouton | id-maros-pangkep-karst | candidate | 61962 | 61776.9 to 62107.1 | 33% |
| moon-mons-mouton | id-tambora-caldera | candidate | 59099 | 58664.4 to 59486 | 36% |
| moon-mons-mouton | id-batur-lava-fields | candidate | 61118 | 60960.5 to 61310.5 | 34% |
| moon-haworth | mauna-kea | known | 58377 | 57213.5 to 59241.1 | 37% |
| moon-haworth | kilauea | known | 55997 | 54380.3 to 57534.8 | 39% |
| moon-haworth | lanzarote-timanfaya | known | 19170 | 16068.4 to 22589.6 | 79% |
| moon-haworth | ries-crater | known | 48188 | 47363.2 to 48926.5 | 48% |
| moon-haworth | askja | known | 13938 | 9746.8 to 17240.9 | 85% |
| moon-haworth | sp-crater | known | 19633 | 19295.8 to 20383.9 | 79% |
| moon-haworth | meteor-crater | known | 15262 | 13638.7 to 16950 | 83% |
| moon-haworth | etna | known | 43650 | 42957.5 to 44436.8 | 53% |
| moon-haworth | sudbury | known | 44102 | 43566.4 to 44603.1 | 52% |
| moon-haworth | mistastin-crater | known | 25733 | 21343.9 to 29612 | 72% |
| moon-haworth | id-kawah-ijen | candidate | 60784 | 60698 to 60855.1 | 34% |
| moon-haworth | id-merapi | candidate | 63490 | 63204.4 to 63607.5 | 31% |
| moon-haworth | id-gua-lawa | candidate | 63682 | 63444.8 to 63774.1 | 31% |
| moon-haworth | id-goa-pandan | candidate | 62381 | 62058.9 to 62594.2 | 32% |
| moon-haworth | id-kesaksak-lava-tube | candidate | 61159 | 60999.8 to 61361.1 | 33% |
| moon-haworth | id-maros-pangkep-karst | candidate | 62021 | 61846.8 to 62153.2 | 33% |
| moon-haworth | id-tambora-caldera | candidate | 59169 | 58744 to 59569.6 | 36% |
| moon-haworth | id-batur-lava-fields | candidate | 61159 | 60999.8 to 61361.1 | 33% |
| moon-shackleton-rim | mauna-kea | known | 58316 | 57143.1 to 59194.1 | 37% |
| moon-shackleton-rim | kilauea | known | 55797 | 54179.9 to 57386.9 | 39% |
| moon-shackleton-rim | lanzarote-timanfaya | known | 19113 | 16007.5 to 22488.5 | 79% |
| moon-shackleton-rim | ries-crater | known | 48205 | 47410.8 to 48955.8 | 48% |
| moon-shackleton-rim | askja | known | 13563 | 9431 to 16836.6 | 85% |
| moon-shackleton-rim | sp-crater | known | 19288 | 18874.9 to 20123.9 | 79% |
| moon-shackleton-rim | meteor-crater | known | 15003 | 13232.7 to 16717.1 | 84% |
| moon-shackleton-rim | etna | known | 43366 | 42505.2 to 44202.1 | 53% |
| moon-shackleton-rim | sudbury | known | 44142 | 43600.9 to 44629.5 | 52% |
| moon-shackleton-rim | mistastin-crater | known | 25765 | 21468.4 to 29630.5 | 72% |
| moon-shackleton-rim | id-kawah-ijen | candidate | 60725 | 60642.7 to 60809.2 | 34% |
| moon-shackleton-rim | id-merapi | candidate | 63466 | 63165.9 to 63594.4 | 31% |
| moon-shackleton-rim | id-gua-lawa | candidate | 63655 | 63408.9 to 63762 | 31% |
| moon-shackleton-rim | id-goa-pandan | candidate | 62395 | 62069 to 62606.2 | 32% |
| moon-shackleton-rim | id-kesaksak-lava-tube | candidate | 61120 | 60962.6 to 61312.7 | 34% |
| moon-shackleton-rim | id-maros-pangkep-karst | candidate | 61958 | 61773.9 to 62106.3 | 33% |
| moon-shackleton-rim | id-tambora-caldera | candidate | 59100 | 58667.3 to 59489.9 | 36% |
| moon-shackleton-rim | id-batur-lava-fields | candidate | 61120 | 60962.6 to 61312.7 | 34% |
| moon-marius-hills | id-kawah-ijen | candidate | 59869 | 59574.1 to 60099.3 | 35% |
| moon-marius-hills | id-merapi | candidate | 61483 | 60524.8 to 62102.3 | 33% |
| moon-marius-hills | id-gua-lawa | candidate | 62311 | 61673.6 to 62705.4 | 32% |
| moon-marius-hills | id-goa-pandan | candidate | 60114 | 59124.6 to 60773.9 | 35% |
| moon-marius-hills | id-kesaksak-lava-tube | candidate | 60004 | 59555.7 to 60370.2 | 35% |
| moon-marius-hills | id-maros-pangkep-karst | candidate | 61725 | 61484 to 61927.2 | 33% |
| moon-marius-hills | id-tambora-caldera | candidate | 58147 | 57726.3 to 58597 | 37% |
| moon-marius-hills | id-batur-lava-fields | candidate | 60004 | 59555.7 to 60370.2 | 35% |
| mars-jezero | atacama-yungay | known | 9540 | 7599.3 to 12391.7 | 90% |
| mars-jezero | haughton-crater | known | 8246 | 4829.9 to 11135.7 | 91% |
| mars-jezero | kilauea | known | 55087 | 53360.2 to 56459.3 | 40% |
| mars-jezero | craters-of-the-moon | known | 1672 | 927 to 2640.3 | 98% |
| mars-jezero | lanzarote-timanfaya | known | 7157 | 3960 to 13184.4 | 92% |
| mars-jezero | askja | known | 19348 | 14153.5 to 23399.6 | 79% |
| mars-jezero | mdrs-utah | known | 1184 | 1060.8 to 1397.1 | 99% |
| mars-jezero | rio-tinto | known | 34656 | 33423.8 to 35898.4 | 62% |
| mars-jezero | dallol | known | 5217 | 3452.9 to 8302.3 | 94% |
| mars-jezero | death-valley-ubehebe | known | 1135 | 1064.8 to 1276 | 99% |
| mars-jezero | pilbara-north-pole-dome | known | 16322 | 13758.8 to 19190 | 82% |
| mars-jezero | arkaroola | known | 2638 | 2247.1 to 3180.8 | 97% |
| mars-jezero | qaidam-basin | known | 2127 | 1508.9 to 2945 | 98% |
| mars-jezero | makhtesh-ramon | known | 1418 | 1128.6 to 1800.9 | 99% |
| mars-jezero | lonar-crater | known | 40106 | 39035 to 40996.4 | 56% |
| mars-jezero | ladakh-tso-kar | known | 42718 | 37202.7 to 47607.9 | 54% |
| mars-jezero | makgadikgadi-pans | known | 18660 | 15921.9 to 21089.4 | 80% |
| mars-jezero | teide | known | 42894 | 39560.4 to 46357.3 | 53% |
| mars-jezero | id-kawah-ijen | candidate | 60135 | 59878 to 60380.7 | 35% |
| mars-jezero | id-merapi | candidate | 62515 | 61864.6 to 62925.8 | 32% |
| mars-jezero | id-gua-lawa | candidate | 62989 | 62478.8 to 63310.2 | 32% |
| mars-jezero | id-goa-pandan | candidate | 61499 | 60915.6 to 61865.2 | 33% |
| mars-jezero | id-kesaksak-lava-tube | candidate | 60329 | 59947.7 to 60696.3 | 34% |
| mars-jezero | id-maros-pangkep-karst | candidate | 61817 | 61551.5 to 61999.2 | 33% |
| mars-jezero | id-tambora-caldera | candidate | 58277 | 57836.1 to 58723.3 | 37% |
| mars-jezero | id-batur-lava-fields | candidate | 60329 | 59947.7 to 60696.3 | 34% |
| mars-gale | atacama-yungay | known | 1400 | 975.8 to 2067 | 99% |
| mars-gale | haughton-crater | known | 11539 | 7692.2 to 13657.4 | 87% |
| mars-gale | kilauea | known | 55553 | 53649.1 to 57260.2 | 40% |
| mars-gale | craters-of-the-moon | known | 13456 | 11942.3 to 14753.2 | 85% |
| mars-gale | lanzarote-timanfaya | known | 13440 | 9875.4 to 19916.4 | 85% |
| mars-gale | askja | known | 30333 | 27075.8 to 33521.3 | 67% |
| mars-gale | mdrs-utah | known | 1192 | 1068.9 to 1347.3 | 99% |
| mars-gale | rio-tinto | known | 36025 | 34548.2 to 37124.2 | 61% |
| mars-gale | dallol | known | 7049 | 4679.6 to 9848.8 | 92% |
| mars-gale | death-valley-ubehebe | known | 946 | 802.9 to 1139.1 | 99% |
| mars-gale | pilbara-north-pole-dome | known | 14743 | 12490.7 to 18313 | 84% |
| mars-gale | arkaroola | known | 8353 | 7250.7 to 10109.1 | 91% |
| mars-gale | qaidam-basin | known | 1316 | 1006.9 to 1762.6 | 99% |
| mars-gale | makhtesh-ramon | known | 2036 | 1704.9 to 2471.1 | 98% |
| mars-gale | lonar-crater | known | 44669 | 44072.9 to 45308.1 | 51% |
| mars-gale | ladakh-tso-kar | known | 597 | 422.7 to 877.1 | 99% |
| mars-gale | makgadikgadi-pans | known | 15470 | 13105.5 to 18646.4 | 83% |
| mars-gale | teide | known | 28024 | 24936.4 to 31000.6 | 70% |
| mars-gale | id-kawah-ijen | candidate | 60501 | 60321.5 to 60608 | 34% |
| mars-gale | id-merapi | candidate | 63481 | 63246.5 to 63580.3 | 31% |
| mars-gale | id-gua-lawa | candidate | 63644 | 63445 to 63740.2 | 31% |
| mars-gale | id-goa-pandan | candidate | 62670 | 62421 to 62805.1 | 32% |
| mars-gale | id-kesaksak-lava-tube | candidate | 61263 | 61086.6 to 61503.2 | 33% |
| mars-gale | id-maros-pangkep-karst | candidate | 62074 | 61908 to 62216.1 | 33% |
| mars-gale | id-tambora-caldera | candidate | 59115 | 58700 to 59554.6 | 36% |
| mars-gale | id-batur-lava-fields | candidate | 61263 | 61086.6 to 61503.2 | 33% |
| mars-arcadia-planitia | haughton-crater | known | 4274 | 2527.6 to 6537 | 95% |
| mars-arcadia-planitia | beacon-valley | known | 49053 | 45591.2 to 51981 | 47% |
| mars-arcadia-planitia | don-juan-pond | known | 57495 | 54924.8 to 59433.4 | 37% |
| mars-arcadia-planitia | ladakh-tso-kar | known | 59593 | 56929.9 to 61230.4 | 35% |
| mars-arcadia-planitia | kangerlussuaq | known | 33392 | 30404.7 to 36904.5 | 64% |
| mars-arcadia-planitia | id-kawah-ijen | candidate | 63730 | 63557.9 to 63853 | 31% |
| mars-arcadia-planitia | id-merapi | candidate | 61471 | 60805.4 to 62092 | 33% |
| mars-arcadia-planitia | id-gua-lawa | candidate | 63524 | 63231.9 to 63768.2 | 31% |
| mars-arcadia-planitia | id-goa-pandan | candidate | 57556 | 56139.1 to 58848.6 | 37% |
| mars-arcadia-planitia | id-kesaksak-lava-tube | candidate | 62142 | 61829.6 to 62460.2 | 32% |
| mars-arcadia-planitia | id-maros-pangkep-karst | candidate | 63695 | 63564.9 to 63806.4 | 31% |
| mars-arcadia-planitia | id-tambora-caldera | candidate | 62776 | 62369.3 to 63038 | 32% |
| mars-arcadia-planitia | id-batur-lava-fields | candidate | 62142 | 61829.6 to 62460.2 | 32% |

