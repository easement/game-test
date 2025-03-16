# **Game Design Document: Match Three Cascade**

## **Game Overview**
**Title:** Match Three Cascade  
**Platform:** Web Browser (Desktop & Mobile)  
**Genre:** Puzzle / Match-Three  
**Engine/Framework:** HTML5, JavaScript, WebGL (e.g., Phaser.js)  
**Target Audience:** Casual gamers, puzzle lovers  

### **Game Summary**
Match Three Cascade is a classic match-three puzzle game where players swap adjacent objects to form a line of three or more matching colors. Matched objects fade out and disappear, while new objects fall from the top to fill the empty spaces. The game includes special power-ups, combos, and a progressive difficulty system.

## **Core Gameplay Mechanics**
### **Matching System**
- Players swap adjacent objects to form horizontal or vertical matches of three or more.
- When a match is made:
  - The matched objects fade out and disappear.
  - New objects fall from the top to replace them.
  - Additional matches triggered by falling objects create a chain reaction (combo).

### **Game Flow**
1. **Starting the Game**  
   - The game starts with a randomized board filled with colored objects.  
   - Players can make their first move immediately.  

2. **Making Matches**  
   - Click or drag an object to swap it with an adjacent one.  
   - If the swap results in a match, the matched objects disappear.  
   - If the swap does not form a match, the objects return to their original positions.  

3. **Falling Objects**  
   - When objects disappear, new ones fall from the top.  
   - Cascades occur if the falling objects create additional matches.  

4. **Scoring**  
   - Basic match (3 in a row) = 10 points per object.  
   - Four-object match = 2x points + a special object.  
   - Five-object match = 3x points + a powerful special object.  
   - Combos (chain reactions) provide bonus points.  

5. **Progression & Difficulty**  
   - Timer-based or move-based gameplay modes.  
   - Increasing difficulty over levels (faster falling objects, time limits).  
   - Introduction of obstacles (e.g., locked objects, blockers).  

## **Power-Ups & Special Objects**
- **Line Clearer:** Forming a match of four creates a row or column-clearing object.  
- **Bomb:** Matching five in an L/T shape creates an explosion that clears a surrounding area.  
- **Rainbow Object:** Matching five in a row creates a wildcard object that removes all objects of one color.  

## **Game Modes**
1. **Classic Mode** – Players must reach a target score before running out of moves.  
2. **Time Attack Mode** – Match as many objects as possible before the timer runs out.  
3. **Endless Mode** – No timer or move limit, just continuous play with increasing difficulty.  

## **UI & Controls**
- **Drag-and-drop (desktop & mobile)**
- **Click/tap to swap adjacent objects**
- **Pause and restart buttons**
- **Score and move
