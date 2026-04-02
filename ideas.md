# Storytelling approach
- Take inspiration from [pudding satellites](https://pudding.cool/2017/10/satellites/)
- Use one main visual scene (Earth + satellites) "map" as the backbone of the whole story
- Visual scene could be a top-down view of Earth with satellites as points in orbit
- The scene stays more or less the same, but what we show on top of it changes as we scroll down the website
- Each section/chapter answers a different question using the same visual scene
- Each chapter can introduce additional charts (time series, bar charts, distributions) that appear alongside the main scene and are dynamically linked to it (hover, selection, filters updating both views)

# Chapters

## 1. Growth over time

**Questions / message**
- How fast is the number of satellites growing?
- When did things start changing?
- Before vs after 2019 (Starlink), emphasize how recent and sudden the growth is

**Additional stats / graphs**
- Line chart: number of satellites per year
- Stacked area chart: accumulation over time

**Visual (main scene)**
- Same map, satellites progressively appearing over time
- Controlled by slider or scroll

**Interactions / linking**
- Slider controls both:
  - map (satellites appear)
  - time chart (cursor moves)

## 2. Altitudes

**Questions / message**
- Where are satellites actually located?
- Why is LEO so crowded?
- Break down by altitude (LEO / MEO / GEO)

**Additional stats / graphs**
- Histogram / density plot of altitude
- Bar chart: number of objects per orbit class

**Visual (main scene)**
- Switch to structured circular regions:
  - LEO close
  - MEO mid
  - GEO far

**Interactions / linking**
- Hover altitude bin -> highlight corresponding satellites on map

## 3. Ownership

**Questions / message**
- Which countries / companies dominate?
- Select a country or operator -> highlight its satellites

**Additional stats / graphs**
- Bar chart: satellites per country
- Bar chart: satellites per operator

**Visual (main scene)**
- Color = country or operator
- Others faded in background

**Interactions / linking**
- Hover bar -> highlight satellites on map

## 4. Types of objects

**Questions / message**
- What is actually in orbit?
- How much of it is useful vs debris?
- Distinguish payloads, debris, rocket bodies, highlight debris

**Additional stats / graphs**
- Pie chart: proportion of object types

**Visual (main scene)**
- Color or shape = object type

**Interactions / linking**
- Hover type -> highlight corresponding objects

## 5. Collision risk (CDMs)

**Questions / message**
- Where are the risks?
- Which objects are most dangerous?
- What types of objects are involved in collisions?

**Additional stats / graphs**
- Graph of CDMs (nodes = objects, edges = potential collisions), bigger nodes = more CDMs
- Breakdown of CDMs by type (debris vs payload, etc.)

**Interactions / linking**
- Hover node in graph:
  - highlight object on map
  - show edges to potential collisions