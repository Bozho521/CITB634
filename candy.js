var candies = ["Blue", "Orange", "Green", "Yellow", "Red", "Purple"];
// var candies = ["Blue", "Orange"]; // for easy testing

var stripedHorizontalCandies = [
    "Blue-Striped-Horizontal",
    "Green-Striped-Horizontal",
    "Orange-Striped-Horizontal",
    "Purple-Striped-Horizontal",
    "Red-Striped-Horizontal",
    "Yellow-Striped-Horizontal"
];

var stripedVerticalCandies = [
    "Blue-Striped-Vertical",
    "Green-Striped-Vertical",
    "Orange-Striped-Vertical",
    "Purple-Striped-Vertical",
    "Red-Striped-Vertical",
    "Yellow-Striped-Vertical"
];

var wrappedCandies = [
    "Blue-Wrapped",
    "Green-Wrapped",
    "Orange-Wrapped",
    "Purple-Wrapped",
    "Red-Wrapped",
    "Yellow-Wrapped"
];

var backgrounds = [
    "images/background_1.jpg",
    "images/background_2.jpg",
    "images/background_3.jpg",
    "images/background_4.jpg",
    "images/background_5.jpg",
    "images/background_6.jpg",
    "images/background_7.jpg",
    "images/background_8.jpg",
    "images/background_9.jpg",
];

var board = [];
var rows = 9;
var columns = 9;
var score = 0;
let reshuffleCount = 3;
let noMoveCounter = 0;
let playerEntry = null;

let bombMoves = {};

var currTile;
var otherTile;

const shuffleButton = document.getElementById("shuffleButton");
const shuffleNumber = document.getElementById("shuffleNumber");

document.getElementById("resetButton").addEventListener("click", resetLeaderboard);

shuffleButton.addEventListener("click", () => {
    if (reshuffleCount > 0) {
        reshuffleCandies();
        reshuffleCount--;

        shuffleNumber.src = `images/digit_${reshuffleCount}.png`;

        if (reshuffleCount === 0) {
            shuffleButton.style.opacity = "0.5";
            shuffleButton.style.pointerEvents = "none";
        }
    }
});

let currentGameEntry = localStorage.getItem("currentGameEntry") || 0;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  Main Game Loop
//
//  - Loads the leaderboard and sets a random background.
//  - Updates the score display and increments game entry.
//  - Starts the game and runs a loop every 100ms to:
//      - Process matches, move candies, and check moves.
//      - Update and save the score.
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

window.onload = function () {
    loadLeaderboard();

    let randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    document.body.style.backgroundImage = `url('${randomBg}')`;

    document.getElementById("score-value").textContent = score;

    currentGameEntry++;
    localStorage.setItem("currentGameEntry", currentGameEntry);

    startGame();

    window.setInterval(function () {
        crushCandy();
        slideCandy();
        generateCandy();
        checkPossibleMoves();

        trackScore(score);
        displayCurrentScore(score);

        saveScore(score);

    }, 100);
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  Event Listener Functions:
//
//  dragStart()     -   Stores the current tile being dragged (currTile).
//
//  dragOver()      -   Prevents the default behavior to allow the element to be dropped.
//
//  dragEnter()     -   Prevents the default behavior to indicate the draggable item is entering a valid drop zone.
//
//  dragDrop()      -   Stores the tile being dropped (otherTile).
//
//  dragEnd()       -   swaps the dragged tile with the target if adjacent
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function dragStart() {
    currTile = this;
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.preventDefault();
}

function dragDrop() {
    otherTile = this;
}

function dragEnd() {
    let currCoords = currTile.id.split("-");
    let r = parseInt(currCoords[0]);
    let c = parseInt(currCoords[1]);

    let otherCoords = otherTile.id.split("-");
    let r2 = parseInt(otherCoords[0]);
    let c2 = parseInt(otherCoords[1]);

    let isAdjacent = Math.abs(r - r2) + Math.abs(c - c2) === 1;

    if (currTile.src.includes("bomb")) {
        if (!(currTile.id in bombMoves)) {
            bombMoves[currTile.id] = 0;
        }

        if (bombMoves[currTile.id] < 3 && isAdjacent) {
            let currImg = currTile.src;
            let otherImg = otherTile.src;
            currTile.src = otherImg;
            otherTile.src = currImg;

            bombMoves[otherTile.id] = bombMoves[currTile.id] + 1;
            delete bombMoves[currTile.id];
        } else {
            log_Message("BOMB MOVE LIMIT REACHED ❗❗");
        }
    }
    else {
        if (currTile.src.includes("blank") || otherTile.src.includes("blank")) {
            return;
        }

        let moveLeft = c2 == c - 1 && r == r2;
        let moveRight = c2 == c + 1 && r == r2;
        let moveUp = r2 == r - 1 && c == c2;
        let moveDown = r2 == r + 1 && c == c2;

        let isAdjacent = moveLeft || moveRight || moveUp || moveDown;

        if (isAdjacent) {
            let currImg = currTile.src;
            let otherImg = otherTile.src;
            currTile.src = otherImg;
            otherTile.src = currImg;

            if (currImg.includes("row_linebreaker")) {
                rowLineBreaker(otherTile);
            } else if (currImg.includes("column_linebreaker")) {
                columnLineBreaker(otherTile);
            } else if (currImg.includes("ultimate_linebreaker")) {
                ultimateLineBreaker(otherTile);
            }

            if (otherImg.includes("row_linebreaker")) {
                rowLineBreaker(currTile);
            } else if (otherImg.includes("column_linebreaker")) {
                columnLineBreaker(currTile);
            } else if (otherImg.includes("ultimate_linebreaker")) {
                ultimateLineBreaker(currTile);
            }

            let validMove = checkValid();
            if (!validMove) {
                let currImg = currTile.src;
                let otherImg = otherTile.src;
                currTile.src = otherImg;
                otherTile.src = currImg;
            }
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  Main Gameplay functions:
//  
//  explodeChocoBomb(bombElement)           - Explodes a Choco-Bomb, affecting 3x3
//                                          - Handles chain reactions of special candies
//
//  explodeFullBoard()                      - Triggers a full-board explosion, affecting all candies on the board.
//
//  columnLineBreaker(linebreakerElement)   - Triggers a column linebreaker
//                                          - Handles chain reactions of special candies
//
//  rowLineBreaker(linebreakerElement)      - Triggers a row linebreaker when clicked.
//                                          - Handles chain reactions of special candies
//
//  ultimateLineBreaker(linebreakerElement) - Triggers an ultimate linebreaker
//                                          - Handles chain reactions of special candies
//
//  crushCandy()    - Calls all candy-crushing functions
//  crushFive()     - Checks for five matching candies in a row or column.
//                  - Spawns a Choco-Bomb / Gives Reshuffle                 @5-crush
//                  - Spawns an Ultimate Linebreaker                        @5-corner-crush
//
//  crushFour()     - Checks for four matching candies in a row or column.
//                  - Spawns a Row Linebreaker/Column Linebreaker           @4-crush
//
//  crushThree()    - Checks for three matching candies in a row or column.
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function explodeChocoBomb(bombElement) {
    let bombId = bombElement.id.split("-");
    let bombRow = parseInt(bombId[0]);
    let bombCol = parseInt(bombId[1]);

    let totalPoints = 0;
    let affectedCandies = [];
    let fullBoardExplosion = false;

    function calculatePoints(candy) {
        let points = 10;
        if (candy.src.includes("Striped-Horizontal")) {
            points = 20;
        } else if (candy.src.includes("Striped-Vertical")) {
            points = 30;
        } else if (candy.src.includes("Wrapped")) {
            points = 50;
        }
        return points;
    }

    for (let r = bombRow - 1; r <= bombRow + 1; r++) {
        for (let c = bombCol - 1; c <= bombCol + 1; c++) {
            if (r >= 0 && r < rows && c >= 0 && c < columns) {
                if (r === bombRow && c === bombCol) continue;

                let candy = board[r][c];

                if (!candy.src.includes("blank")) {
                    totalPoints += calculatePoints(candy);

                    if (candy.src.includes("row_linebreaker")) {
                        for (let cc = 0; cc < columns; cc++) {
                            let rowCandy = board[r][cc];
                            if (!rowCandy.src.includes("blank")) {
                                totalPoints += calculatePoints(rowCandy);
                                affectedCandies.push(rowCandy);
                            }
                        }

                        if (r - 1 >= 0) {
                            for (let cc = 0; cc < columns; cc++) {
                                let rowCandy = board[r - 1][cc];
                                if (!rowCandy.src.includes("blank")) {
                                    totalPoints += calculatePoints(rowCandy);
                                    affectedCandies.push(rowCandy);
                                }
                            }
                        }

                        if (r + 1 < rows) {
                            for (let cc = 0; cc < columns; cc++) {
                                let rowCandy = board[r + 1][cc];
                                if (!rowCandy.src.includes("blank")) {
                                    totalPoints += calculatePoints(rowCandy);
                                    affectedCandies.push(rowCandy);
                                }
                            }
                        }
                    }

                    else if (candy.src.includes("column_linebreaker")) {
                        for (let rr = 0; rr < rows; rr++) {
                            let colCandy = board[rr][c];
                            if (!colCandy.src.includes("blank")) {
                                totalPoints += calculatePoints(colCandy);
                                affectedCandies.push(colCandy);
                            }
                        }

                        if (c - 1 >= 0) {
                            for (let rr = 0; rr < rows; rr++) {
                                let colCandy = board[rr][c - 1];
                                if (!colCandy.src.includes("blank")) {
                                    totalPoints += calculatePoints(colCandy);
                                    affectedCandies.push(colCandy);
                                }
                            }
                        }

                        if (c + 1 < columns) {
                            for (let rr = 0; rr < rows; rr++) {
                                let colCandy = board[rr][c + 1];
                                if (!colCandy.src.includes("blank")) {
                                    totalPoints += calculatePoints(colCandy);
                                    affectedCandies.push(colCandy);
                                }
                            }
                        }
                    }

                    else if (candy.src.includes("ultimate_linebreaker")) {
                        for (let cc = Math.max(0, c - 1); cc <= Math.min(columns - 1, c + 1); cc++) {
                            for (let rr = 0; rr < rows; rr++) {
                                let rowCandy = board[rr][cc];
                                if (!rowCandy.src.includes("blank")) {
                                    totalPoints += calculatePoints(rowCandy);
                                    affectedCandies.push(rowCandy);
                                }
                            }
                        }
                    
                        for (let rr = Math.max(0, r - 1); rr <= Math.min(rows - 1, r + 1); rr++) {
                            for (let cc = 0; cc < columns; cc++) {
                                let colCandy = board[rr][cc];
                                if (!colCandy.src.includes("blank")) {
                                    totalPoints += calculatePoints(colCandy);
                                    affectedCandies.push(colCandy);
                                }
                            }
                        }
                    }

                    affectedCandies.push(candy);

                    if (candy.src.includes("bomb")) {
                        fullBoardExplosion = true;
                    }
                }
            }
        }
    }

    let bombCandy = board[bombRow][bombCol];
    if (!bombCandy.src.includes("blank")) {
        totalPoints += calculatePoints(bombCandy);
        affectedCandies.push(bombCandy);
    }

    if (fullBoardExplosion) {
        explodeFullBoard();
        return;
    } else {
        affectedCandies.forEach((candy) => {
            let randomFire = Math.random() < 0.5 ? "fire_icon_1.png" : "fire_icon_2.png";
            candy.src = `./images/${randomFire}`;
        });

        setTimeout(() => {
            affectedCandies.forEach((candy) => {
                let randomFire = Math.random() < 0.5 ? "fire_icon_1.png" : "fire_icon_2.png";
                candy.src = `./images/${randomFire}`;
            });
        }, 300);

        setTimeout(() => {
            affectedCandies.forEach((candy) => {
                candy.src = "./images/blank.png";
            });
        }, 500);

        score += totalPoints;
        log_Message("CHOCO-BOMB DETONATED! +" + totalPoints + " pts! 💥🔥");
    }
}

function explodeFullBoard() {
    let totalPoints = 0;
    let affectedCandies = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            let candy = board[r][c];

            if (!candy.src.includes("blank")) {
                let points = 10;

                if (candy.src.includes("Striped-Horizontal")) {
                    points = 20;
                } else if (candy.src.includes("Striped-Vertical")) {
                    points = 30;
                } else if (candy.src.includes("Wrapped")) {
                    points = 50;
                }

                totalPoints += points;
                affectedCandies.push(candy);
            }
        }
    }

    affectedCandies.forEach((candy) => {
        let randomFire = Math.random() < 0.5 ? "fire_icon_1.png" : "fire_icon_2.png";
        candy.src = `./images/${randomFire}`;
    });

    setTimeout(() => {
        affectedCandies.forEach((candy) => {
            let randomFire = Math.random() < 0.5 ? "fire_icon_1.png" : "fire_icon_2.png";
            candy.src = `./images/${randomFire}`;
        });
    }, 300);

    setTimeout(() => {
        affectedCandies.forEach((candy) => {
            candy.src = "./images/blank.png";
        });
    }, 500);

    score += totalPoints;
    log_Message("FULL BOARD EXPLOSION: +" + totalPoints + "pts❗❗🔥💥")
}

function columnLineBreaker(linebreakerElement) {

    let breakerId = linebreakerElement.id.split("-");
    let breakerCol = parseInt(breakerId[1]);

    let affectedCandies = [];
    let totalPoints = 0;

    for (let r = 0; r < rows; r++) {
        let candy = board[r][breakerCol];
        if (!candy.src.includes("blank")) {
            let points = 10;
            if (candy.src.includes("Striped-Horizontal")) {
                points = 20;
            } else if (candy.src.includes("Striped-Vertical")) {
                points = 30;
            } else if (candy.src.includes("Wrapped")) {
                points = 50;
            }

            if (candy.src.includes("row_linebreaker")) {
                rowLineBreaker(candy);
            } else if (candy.src.includes("ultimate_linebreaker")) {
                ultimateLineBreaker(candy);
            } else if (candy.src.includes("bomb")) {
                explodeChocoBomb(candy);
            }

            totalPoints += points;
            affectedCandies.push(candy);
        }
    }

    affectedCandies.forEach((candy) => {
        let randomFire = Math.random() < 0.5 ? "fire_icon_1.png" : "fire_icon_2.png";
        candy.src = `./images/${randomFire}`;
    });

    setTimeout(() => {
        affectedCandies.forEach((candy) => {
            let randomFire = Math.random() < 0.5 ? "fire_icon_1.png" : "fire_icon_2.png";
            candy.src = `./images/${randomFire}`;
        });
    }, 300);

    setTimeout(() => {
        affectedCandies.forEach((candy) => {
            candy.src = "./images/blank.png";
        });
        score += totalPoints;
    }, 500);

    log_Message("Column break: +" + totalPoints + "pts❗💥");
}

function rowLineBreaker(linebreakerElement) {
    let breakerId = linebreakerElement.id.split("-");
    let breakerRow = parseInt(breakerId[0]);

    let affectedCandies = [];
    let totalPoints = 0;

    for (let c = 0; c < columns; c++) {
        let candy = board[breakerRow][c];
        if (!candy.src.includes("blank")) {
            let points = 10;
            if (candy.src.includes("Striped-Horizontal")) {
                points = 20;
            } else if (candy.src.includes("Striped-Vertical")) {
                points = 30;
            } else if (candy.src.includes("Wrapped")) {
                points = 50;
            }

            if (candy.src.includes("column_linebreaker")) {
                columnLineBreaker(candy);
            } else if (candy.src.includes("ultimate_linebreaker")) {
                ultimateLineBreaker(candy);
            } else if (candy.src.includes("bomb")) {
                explodeChocoBomb(candy);
            }

            totalPoints += points;
            affectedCandies.push(candy);
        }
    }

    affectedCandies.forEach((candy) => {
        let randomFire = Math.random() < 0.5 ? "fire_icon_1.png" : "fire_icon_2.png";
        candy.src = `./images/${randomFire}`;
    });

    setTimeout(() => {
        affectedCandies.forEach((candy) => {
            let randomFire = Math.random() < 0.5 ? "fire_icon_1.png" : "fire_icon_2.png";
            candy.src = `./images/${randomFire}`;
        });
    }, 300);

    setTimeout(() => {
        affectedCandies.forEach((candy) => {
            candy.src = "./images/blank.png";
        });
        score += totalPoints;
    }, 500);

    log_Message("Row break: +" + totalPoints + "pts❗💥");
}

function ultimateLineBreaker(linebreakerElement) {
    let breakerId = linebreakerElement.id.split("-");
    let breakerRow = parseInt(breakerId[0]);
    let breakerCol = parseInt(breakerId[1]);

    let affectedCandies = [];
    let totalPoints = 0;

    for (let c = 0; c < columns; c++) {
        let candy = board[breakerRow][c];

        if (!candy.src.includes("blank") && !candy.dataset.processed) {
            let points = 10;

            if (candy.src.includes("Striped-Horizontal")) {
                points = 20;
            } else if (candy.src.includes("Striped-Vertical")) {
                points = 30;
            } else if (candy.src.includes("Wrapped")) {
                points = 50;
            }

            candy.dataset.processed = "true";

            if (candy.src.includes("column_linebreaker")) {
                columnLineBreaker(candy);
            } else if (candy.src.includes("row_linebreaker")) {
                rowLineBreaker(candy);
            } else if (candy.src.includes("ultimate_linebreaker")) {
                ultimateLineBreaker(candy);
            } else if (candy.src.includes("bomb")) {
                explodeChocoBomb(candy);
            }

            totalPoints += points;
            affectedCandies.push(candy);
        }
    }

    for (let r = 0; r < rows; r++) {
        if (r === breakerRow) continue;

        let candy = board[r][breakerCol];

        if (!candy.src.includes("blank") && !candy.dataset.processed) {
            let points = 10;

            if (candy.src.includes("Striped-Horizontal")) {
                points = 20;
            } else if (candy.src.includes("Striped-Vertical")) {
                points = 30;
            } else if (candy.src.includes("Wrapped")) {
                points = 50;
            }

            candy.dataset.processed = "true";

            if (candy.src.includes("column_linebreaker")) {
                columnLineBreaker(candy);
            } else if (candy.src.includes("row_linebreaker")) {
                rowLineBreaker(candy);
            } else if (candy.src.includes("ultimate_linebreaker")) {
                ultimateLineBreaker(candy);
            }

            totalPoints += points;
            affectedCandies.push(candy);
        }
    }

    affectedCandies.forEach((candy) => {
        let randomFire = Math.random() < 0.5 ? "fire_icon_1.png" : "fire_icon_2.png";
        candy.src = `./images/${randomFire}`;
    });

    setTimeout(() => {
        affectedCandies.forEach((candy) => {
            let randomFire = Math.random() < 0.5 ? "fire_icon_1.png" : "fire_icon_2.png";
            candy.src = `./images/${randomFire}`;
        });
    }, 300);

    setTimeout(() => {
        affectedCandies.forEach((candy) => {
            candy.src = "./images/blank.png";
        });
    }, 500);

    score += totalPoints;
    log_Message("Ultimate LineBreaker: +" + totalPoints + " pts! 💥");

    setTimeout(() => {
        affectedCandies.forEach((candy) => {
            delete candy.dataset.processed;
        });
    }, 1000);
}

function crushCandy() {
    crushFive();
    crushFour();
    crushThree();
    document.getElementById("score-value").innerText = score;
}

function crushFive() {
    let fiveCrush = false;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns - 4; c++) {
            let candy1 = board[r][c];
            let candy2 = board[r][c + 1];
            let candy3 = board[r][c + 2];
            let candy4 = board[r][c + 3];
            let candy5 = board[r][c + 4];

            if (candy1.src == candy2.src && candy2.src == candy3.src && candy3.src == candy4.src && candy4.src == candy5.src &&
                !candy1.src.includes("blank") && !candy1.src.includes("bomb") &&
                !candy1.src.includes("fire") && !candy1.src.includes("linebreaker")
            ) {
                let points = 100;
                if (candy1.src.includes("Striped-Horizontal") || candy1.src.includes("Striped-Vertical")) {
                    points *= candy1.src.includes("Striped-Horizontal") ? 2 : 3;
                }
                if (candy1.src.includes("Wrapped")) {
                    points *= 5;
                }

                candy1.src = candy2.src = candy4.src = candy5.src = "./images/blank.png";
                
                candy3.src = "./images/choco-bomb.png";
                chocoBombElement = candy3;

                fiveCrush = true;
                log_Message("AMAZING A 5 CRUSH: +" + points + "pts❗❗");
            }
        }
    }

    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows - 4; r++) {
            let candy1 = board[r][c];
            let candy2 = board[r + 1][c];
            let candy3 = board[r + 2][c];
            let candy4 = board[r + 3][c];
            let candy5 = board[r + 4][c];

            if (candy1.src == candy2.src && candy2.src == candy3.src && candy3.src == candy4.src && candy4.src == candy5.src &&
                !candy1.src.includes("blank") && !candy1.src.includes("bomb") &&
                !candy1.src.includes("fire") && !candy1.src.includes("linebreaker")
            ) {
                let points = 100;
                if (candy1.src.includes("Striped-Horizontal") || candy1.src.includes("Striped-Vertical")) {
                    points *= candy1.src.includes("Striped-Horizontal") ? 2 : 3;
                }
                if (candy1.src.includes("Wrapped")) {
                    points *= 5;
                }

                candy1.src = candy2.src = candy4.src = candy5.src = "./images/blank.png";

                candy3.src = "./images/choco-bomb.png";
                chocoBombElement = candy3;

                fiveCrush = true;
                log_Message("AMAZING A 5 CRUSH: +" + points + "pts❗❗");
            }
        }
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            let candy1 = board[r][c];

            if (!candy1.src.includes("blank") && !candy1.src.includes("bomb") && !candy1.src.includes("fire") && !candy1.src.includes("linebreaker")) {
                const patterns = [
                    { dr1: 0, dc1: 1, dr2: 0, dc2: 2, dr3: 1, dc3: 0, dr4: 2, dc4: 0, cr: 1, cc: 1 },
                    { dr1: 0, dc1: 1, dr2: 0, dc2: 2, dr3: -1, dc3: 0, dr4: -2, dc4: 0, cr: -1, cc: 1 },
                    { dr1: 0, dc1: -1, dr2: 0, dc2: -2, dr3: 1, dc3: 0, dr4: 2, dc4: 0, cr: 1, cc: -1 },
                    { dr1: 0, dc1: -1, dr2: 0, dc2: -2, dr3: -1, dc3: 0, dr4: -2, dc4: 0, cr: -1, cc: -1 }
                ];

                for (let pattern of patterns) {
                    let c1 = board[r + pattern.dr1]?.[c + pattern.dc1];
                    let c2 = board[r + pattern.dr2]?.[c + pattern.dc2];
                    let c3 = board[r + pattern.dr3]?.[c + pattern.dc3];
                    let c4 = board[r + pattern.dr4]?.[c + pattern.dc4];

                    if (c1 && c2 && c3 && c4 &&
                        c1.src == candy1.src && c2.src == candy1.src &&
                        c3.src == candy1.src && c4.src == candy1.src) {

                        c3.src = "./images/ultimate_linebreaker.png";

                        candy1.src = c1.src = c2.src = c4.src = "./images/blank.png";

                        log_Message("5-candy corner - Ultimate Linebreaker! 🎯");
                        fiveCrush = true;
                        break;
                    }
                }
            }
        }
    }

    if (fiveCrush && reshuffleCount < 3) {
        log_Message("Gained Additional Reshuffle 🔀");
        reshuffleCount++;
        shuffleNumber.src = `images/digit_${reshuffleCount}.png`;
        shuffleButton.style.opacity = "1";
        shuffleButton.style.pointerEvents = "auto";
    }
}

function crushFour() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns - 3; c++) {
            let candy1 = board[r][c];
            let candy2 = board[r][c + 1];
            let candy3 = board[r][c + 2];
            let candy4 = board[r][c + 3];

            if (candy1.src == candy2.src && candy2.src == candy3.src && candy3.src == candy4.src &&
                !candy1.src.includes("blank") && !candy1.src.includes("bomb") &&
                !candy1.src.includes("fire") && !candy1.src.includes("linebreaker")
            ) {
                let points = 50;
                if (candy1.src.includes("Striped-Horizontal") || candy1.src.includes("Striped-Vertical")) {
                    points = candy1.src.includes("Striped-Horizontal") ? points *= 2 : points *= 3;
                }

                if (candy1.src.includes("Wrapped")) {
                    points *= 5;
                }

                candy1.src = "./images/blank.png";
                candy2.src = "./images/blank.png";
                candy3.src = "./images/blank.png";
                candy4.src = "./images/blank.png";

                let spawnIndex = Math.random() < 0.5 ? 1 : 2;
                board[r][c + spawnIndex].src = "./images/row_linebreaker.png";

                score += points;
                log_Message("WOW.. 4 OF A KIND! +" + points + "pts❗❗");
            }
        }
    }

    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows - 3; r++) {
            let candy1 = board[r][c];
            let candy2 = board[r + 1][c];
            let candy3 = board[r + 2][c];
            let candy4 = board[r + 3][c];

            if (candy1.src == candy2.src && candy2.src == candy3.src && candy3.src == candy4.src &&
                !candy1.src.includes("blank") && !candy1.src.includes("bomb") &&
                !candy1.src.includes("fire") && !candy1.src.includes("linebreaker")
            ) {
                let points = 50;
                if (candy1.src.includes("Striped-Horizontal") || candy1.src.includes("Striped-Vertical")) {
                    points = candy1.src.includes("Striped-Horizontal") ? points *= 2 : points *= 3;
                }

                if (candy1.src.includes("Wrapped")) {
                    points *= 5;
                }

                candy1.src = "./images/blank.png";
                candy2.src = "./images/blank.png";
                candy3.src = "./images/blank.png";
                candy4.src = "./images/blank.png";

                let spawnIndex = Math.random() < 0.5 ? 1 : 2;
                board[r + spawnIndex][c].src = "./images/column_linebreaker.png";

                score += points;
                log_Message("WOW.. 4 OF A KIND! +" + points + "pts❗❗");
            }
        }
    }
}

function crushThree() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns - 2; c++) {
            let candy1 = board[r][c];
            let candy2 = board[r][c + 1];
            let candy3 = board[r][c + 2];

            if (candy1.src == candy2.src && candy2.src == candy3.src &&
                !candy1.src.includes("blank") && !candy1.src.includes("bomb") &&
                !candy1.src.includes("fire") && !candy1.src.includes("linebreaker")
            ) {
                let points = 30;

                if (candy1.src.includes("Striped-Horizontal") || candy1.src.includes("Striped-Vertical")) {
                    points = candy1.src.includes("Striped-Horizontal") ? points *= 2 : points *= 3;
                }
                if (candy1.src.includes("Wrapped")) {
                    points *= 5;
                }

                candy1.src = "./images/blank.png";
                candy2.src = "./images/blank.png";
                candy3.src = "./images/blank.png";

                score += points;
                log_Message("Crushed a 3: +" + points + "pts❗");
            }
        }
    }

    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows - 2; r++) {
            let candy1 = board[r][c];
            let candy2 = board[r + 1][c];
            let candy3 = board[r + 2][c];

            if (candy1.src == candy2.src && candy2.src == candy3.src &&
                !candy1.src.includes("blank") && !candy1.src.includes("bomb") &&
                !candy1.src.includes("fire") && !candy1.src.includes("linebreaker")
            ) {
                let points = 30;

                if (candy1.src.includes("Striped-Horizontal") || candy1.src.includes("Striped-Vertical")) {
                    points = candy1.src.includes("Striped-Horizontal") ? points *= 2 : points *= 3;
                }
                if (candy1.src.includes("Wrapped")) {
                    points *= 5;
                }

                candy1.src = "./images/blank.png";
                candy2.src = "./images/blank.png";
                candy3.src = "./images/blank.png";

                score += points;
                log_Message("Crushed a 3: +" + points + "pts❗");
            }
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  Helper functions:
//  
//  startGame()             - Initializes the game board and populates it with candies.
//
//  randomCandy()           - Randomly generates candies based on the current score.
//
//  generateCandy()         - Generates new random candies in the empty slots at the top of the board.
//
//  slideCandy()            - Moves candies downward to fill empty spaces in the board after a match is cleared.
//
//  checkValid()            - Checks if there are any valid matches.
//
//  checkIfCrushExists()    - Checks if there are any matches (three or more identical candies in a row or column).
//
//  checkPossibleMoves()    - Checks if any valid move exists that would create a match.
//
//  hasValidMove()          - Checks if there is at least one valid move left on the board.
//
//  swapCandies(r1, c1, r2, c2) - Swaps two candies on the board.
//
//  checkSwap(r1, c1, r2, c2) - Simulates swapping two candies and checks if it creates a valid match.
//
//  reshuffleCandies()      - Randomly shuffles all candies on the board and ensures at least one valid move exists.
//
//  trackScore(newScore)    - Updates the player's current score display in the UI.
//
//  displayCurrentScore(score) - Updates the leaderboard display with the current game score.
//
//  saveScore(playerScore)  - Saves the player's score to local storage, updates the leaderboard, and keeps the top 10 scores.
//
//  loadLeaderboard()       - Loads the leaderboard data from local storage and displays the top 10 scores.
//
//  resetLeaderboard()      - Resets the leaderboard by clearing all saved scores from local storage.
//
//  log_Message(message)    - Displays a temporary log message on the screen and removes the oldest if more than 17 exist.
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function startGame() {
    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < columns; c++) {
            let tile = document.createElement("img");
            tile.id = r.toString() + "-" + c.toString();
            tile.src = "./images/" + randomCandy() + ".png";

            tile.addEventListener("dragstart", dragStart);
            tile.addEventListener("dragover", dragOver);
            tile.addEventListener("dragenter", dragEnter);
            tile.addEventListener("drop", dragDrop);
            tile.addEventListener("dragend", dragEnd);

            tile.addEventListener("click", function (event) {
                if (event.target.src.includes("choco-bomb.png")) {
                    explodeChocoBomb(event.target);
                }
                if (event.target.src.includes("column_linebreaker.png")) {
                    columnLineBreaker(event.target);
                }
                if (event.target.src.includes("row_linebreaker.png")) {
                    rowLineBreaker(event.target);
                }
                if (event.target.src.includes("ultimate_linebreaker.png")) {
                    ultimateLineBreaker(event.target);
                }
            });

            document.getElementById("board").append(tile);
            row.push(tile);
        }
        board.push(row);
    }

    console.log(board);
}

function randomCandy() {
    let availableCandies = candies.slice();

    if (score >= 250) {
        availableCandies = availableCandies.concat(stripedHorizontalCandies);
    }

    if (score >= 500) {
        availableCandies = availableCandies.concat(stripedVerticalCandies);
    }

    if (score >= 1000) {
        availableCandies = availableCandies.concat(wrappedCandies);
    }

    return availableCandies[Math.floor(Math.random() * availableCandies.length)];
}

function generateCandy() {
    for (let c = 0; c < columns; c++) {
        if (board[0][c].src.includes("blank")) {
            board[0][c].src = "./images/" + randomCandy() + ".png";
        }
    }
}

function slideCandy() {
    for (let c = 0; c < columns; c++) {
        let ind = rows - 1;
        for (let r = columns - 1; r >= 0; r--) {
            if (!board[r][c].src.includes("blank")) {
                board[ind][c].src = board[r][c].src;
                ind -= 1;
            }
        }

        for (let r = ind; r >= 0; r--) {
            board[r][c].src = "./images/blank.png";
        }
    }
}

function checkValid() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns - 2; c++) {
            if (board[r][c].src === board[r][c + 1].src &&
                board[r][c + 1].src === board[r][c + 2].src &&
                !board[r][c].src.includes("blank")) {
                return true;
            }
        }
    }

    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows - 2; r++) {
            if (board[r][c].src === board[r + 1][c].src &&
                board[r + 1][c].src === board[r + 2][c].src &&
                !board[r][c].src.includes("blank")) {
                return true;
            }
        }
    }

    return false;
}

function checkIfCrushExists() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns - 2; c++) {
            if (board[r][c].src === board[r][c + 1].src && board[r][c].src === board[r][c + 2].src && 
                !board[r][c].src.includes("blank")) {
                return true;
            }
        }
    }

    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows - 2; r++) {
            if (board[r][c].src === board[r + 1][c].src && board[r][c] === board[r + 2][c].src && 
                !board[r][c].src.includes("blank")) {
                return true;
            }
        }
    }

    return false;
}

function checkPossibleMoves() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (c < columns - 1) {
                swapCandies(r, c, r, c + 1);
                if (checkIfCrushExists()) {
                    swapCandies(r, c, r, c + 1);
                    noMoveCounter = 0;
                    return true;
                }
                swapCandies(r, c, r, c + 1);
            }

            if (r < rows - 1) {
                swapCandies(r, c, r + 1, c);
                if (checkIfCrushExists()) {
                    swapCandies(r, c, r + 1, c);
                    noMoveCounter = 0;
                    return true;
                }
                swapCandies(r, c, r + 1, c);
            }
        }
    }

    noMoveCounter++;

    if (noMoveCounter >= 100) {
        if (reshuffleCount == 0)
        {
            log_Message("No possible moves that would crush candies ❌");
            log_Message("Reset the game");
        }
        else{
            log_Message("💡 You have reshuffles! Use them to keep crushing! 🔥");
        }
        noMoveCounter = 0;
    }

    return false;
}

function hasValidMove() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (c < columns - 1) {
                if (checkSwap(r, c, r, c + 1)) return true;
            }
            if (r < rows - 1) {
                if (checkSwap(r, c, r + 1, c)) return true;
            }
        }
    }
    return false;
}

function swapCandies(r1, c1, r2, c2) {
    let temp = board[r1][c1].src;
    board[r1][c1].src = board[r2][c2].src;
    board[r2][c2].src = temp;
}

function checkSwap(r1, c1, r2, c2) {
    let temp = board[r1][c1].src;
    board[r1][c1].src = board[r2][c2].src;
    board[r2][c2].src = temp;

    let isValid = checkValid();

    board[r2][c2].src = board[r1][c1].src;
    board[r1][c1].src = temp;

    return isValid;
}

function reshuffleCandies() {
    let allCandies = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            allCandies.push(board[r][c].src);
        }
    }

    for (let i = allCandies.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [allCandies[i], allCandies[j]] = [allCandies[j], allCandies[i]];
    }

    let index = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            board[r][c].src = allCandies[index++];
        }
    }

    log_Message("Board Reshuffled ❗🔀", 0);

    if (!hasValidMove()) {
        reshuffleCandies();
    }
}

function trackScore(newScore) {
    score = newScore;
    document.getElementById("score-value").textContent = score;
}

function displayCurrentScore(score) {
    let leaderboardList = document.getElementById("leaderboard-list");

    let currentGameItem = document.createElement("li");
    currentGameItem.textContent = `Current Game: ${score} pts`;
    leaderboardList.prepend(currentGameItem);

    loadLeaderboard();
}

function saveScore(playerScore) {
    let data = localStorage.getItem("leaderboard");
    let leaderboard = data ? JSON.parse(data) : [];

    let playerName = `Entry #${currentGameEntry}`;
    let existingPlayer = leaderboard.find(entry => entry.name === playerName);

    if (existingPlayer) {
        if (playerScore > existingPlayer.score) {
            existingPlayer.score = playerScore;
        }
    } else {
        leaderboard.push({ name: playerName, score: playerScore });
    }

    leaderboard.sort((a, b) => b.score - a.score);

    if (leaderboard.length > 10) {
        leaderboard = leaderboard.slice(0, 10);
    }

    try {
        localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
        console.log("Leaderboard updated successfully:", leaderboard);
    } catch (e) {
        console.error("Error saving leaderboard:", e);
    }
}

function loadLeaderboard() {
    let data = localStorage.getItem("leaderboard");
    console.log("Loading leaderboard data:", data);

    let leaderboard = data ? JSON.parse(data) : [];

    let leaderboardList = document.getElementById("leaderboard-list");
    leaderboardList.innerHTML = "";

    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = "No leaderboard data available.";
    } else {
        leaderboard.forEach((entry, index) => {
            let listItem = document.createElement("li");
            listItem.textContent = `${index + 1}. ${entry.name}: ${entry.score} pts`;
            leaderboardList.appendChild(listItem);
        });
    }
}

function resetLeaderboard() {
    localStorage.removeItem("leaderboard");
    localStorage.setItem("currentGameEntry", 0);
    loadLeaderboard();
}

function log_Message(message) {
    let logDiv = document.getElementById("log");

    let newMessage = document.createElement("div");
    newMessage.innerText = message;
    newMessage.style.color = "white";
    newMessage.style.fontWeight = "bold";

    logDiv.appendChild(newMessage);

    while (logDiv.children.length > 17) {
        logDiv.removeChild(logDiv.firstChild);
    }

    setTimeout(() => {
        if (newMessage.parentNode) {
            logDiv.removeChild(newMessage);
        }
    }, 3000);
}