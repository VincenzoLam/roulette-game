let canvas = document.getElementById("rouletteCanvas");
let ctx = canvas.getContext("2d");
let balance = 10000;
let correctGuesses = 0;
let totalGuesses = 0;
let totalTime = 0;
let bets = [];
let actualWinnings = 0;
let speedRunActive = false;
let startTime = Date.now();

const pockets = {
    1: "red", 2: "black", 3: "red",
    4: "black", 5: "red", 6: "black",
    7: "red", 8: "black", 9: "red"
};

function updateSliderValue(value) {
    document.getElementById("sliderValue").textContent = value;
}

function resizeCanvas() {
    const containerWidth = canvas.parentElement.clientWidth;
    const containerHeight = canvas.parentElement.clientHeight;
    const size = Math.min(containerWidth, containerHeight);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = size;
    canvas.height = size;
    drawTable();
}

function drawTable() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let size = canvas.width / 3;

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            let number = row * 3 + col + 1;
            ctx.fillStyle = pockets[number];
            ctx.fillRect(col * size, row * size, size, size);
            ctx.strokeStyle = "#ffffff";
            ctx.strokeRect(col * size, row * size, size, size);

            if (number === 5) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = "gold";
                ctx.strokeRect(col * size, row * size, size, size);
                ctx.lineWidth = 1;
            }
        }
    }

    drawBets();
}

function drawBets() {
    let size = canvas.width / 3;
    let chipRadius = size / 4;
    let fontSize = chipRadius / 2;

    bets.forEach(([betType, betValue, betAmount]) => {
        let chips = betAmount;
        if (betType === 'straight') {
            let val = betValue[0];
            let row = Math.floor((val - 1) / 3);
            let col = (val - 1) % 3;
            drawChip(col * size + size / 2, row * size + size / 2, chipRadius, fontSize, chips);
        } else if (betType === 'split') {
            let [val1, val2] = betValue;
            let row1 = Math.floor((val1 - 1) / 3);
            let col1 = (val1 - 1) % 3;
            let row2 = Math.floor((val2 - 1) / 3);
            let col2 = (val2 - 1) % 3;
            let xPos, yPos;
            if (row1 === row2) {  // Horizontal split
                xPos = (col1 + col2 + 1) * size / 2;
                yPos = row1 * size + size / 2;
            } else {  // Vertical split
                xPos = col1 * size + size / 2;
                yPos = (row1 + row2 + 1) * size / 2;
            }
            drawChip(xPos, yPos, chipRadius, fontSize, chips);
        } else if (betType === 'corner') {
            let [val1, val2, val3, val4] = betValue;
            let row1 = Math.floor((val1 - 1) / 3);
            let col1 = (val1 - 1) % 3;
            let row4 = Math.floor((val4 - 1) / 3);
            let col4 = (val4 - 1) % 3;
            let xPos = (col1 + col4 + 1) * size / 2;
            let yPos = (row1 + row4 + 1) * size / 2;
            drawChip(xPos, yPos, chipRadius, fontSize, chips);
        }
    });
}

function drawChip(x, y, radius, fontSize, chips) {
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(chips, x, y);
}

function randomPick() {
    const betTypes = ['straight', 'split', 'corner'];
    const validBets = {
        'straight': [[5]],
        'split': [[4, 5], [5, 6], [2, 5], [5, 8]],
        'corner': [[1, 2, 4, 5], [2, 3, 5, 6], [4, 5, 7, 8], [5, 6, 8, 9]]
    };

    let numPositions = document.getElementById("numPositions").value;

    if (balance < 1) {
        alert("Insufficient Balance: Not enough balance to place a random bet.");
        return;
    }

    let possiblePositions = [];
    for (let betType in validBets) {
        validBets[betType].forEach(betValue => {
            possiblePositions.push([betType, betValue]);
        });
    }

    if (numPositions > possiblePositions.length) {
        numPositions = possiblePositions.length;
    }

    let chosenPositions = randomSample(possiblePositions, numPositions);

    chosenPositions.forEach(([betType, betValue]) => {
        let maxBetAmount = Math.min(balance, 10);  // Ensure bet does not exceed remaining balance
        let betAmount = Math.floor(Math.random() * maxBetAmount) + 1;
        let existingBetAmount = bets.filter(b => b[0] === betType && JSON.stringify(b[1]) === JSON.stringify(betValue))
            .reduce((sum, b) => sum + b[2], 0);
        if (existingBetAmount + betAmount > 10) {
            betAmount = 10 - existingBetAmount;  // Adjust bet amount to not exceed 10 chips
        }
        if (betAmount > 0) {
            bets.push([betType, betValue, betAmount]);
            balance -= betAmount;
            console.log(`Random Bet: Type=${betType}, Value=${JSON.stringify(betValue)}, Amount=${betAmount} chips`);
        }
    });

    document.getElementById("balance").textContent = `Balance: ${balance} chips`;
    drawTable();
}

function randomSample(arr, n) {
    let result = new Array(n);
    let len = arr.length;
    let taken = new Array(len);
    while (n--) {
        let x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

function calculateWinnings() {
    actualWinnings = 0;
    let betPositions = {};
    bets.forEach(([betType, betValue, betAmount]) => {
        let key = JSON.stringify([betType, betValue]);
        if (betPositions[key]) {
            betPositions[key] += betAmount;
        } else {
            betPositions[key] = betAmount;
        }
    });

    for (let key in betPositions) {
        let [betType, betValue] = JSON.parse(key);
        let betAmount = betPositions[key];
        let winnings = determineWinnings(betType, betValue, 5);
        if (winnings !== 0) {
            actualWinnings += betAmount * winnings;  // Exclude the original bet in the payout
        }
    }
    console.log(`Total winnings calculated: ${actualWinnings} chips`);
}

function determineWinnings(betType, betValue, resultPocket) {
    if (betType === 'straight' && resultPocket === betValue[0]) {
        return 35;  // 35 to 1 payout
    } else if (betType === 'split' && betValue.includes(resultPocket)) {
        return 17;  // 17 to 1 payout
    } else if (betType === 'corner' && betValue.includes(resultPocket)) {
        return 8;  // 8 to 1 payout
    }
    return 0;  // lose the bet
}

function checkGuess() {
    let guessedWinnings = parseInt(document.getElementById("winningsGuess").value);
    if (isNaN(guessedWinnings)) {
        document.getElementById("result").textContent = "Invalid Input. Please enter a valid guess.";
        return;
    }
    
    let endTime = Date.now();
    calculateWinnings();  // Calculate the winnings internally
    
    totalGuesses++;
    totalTime += (endTime - startTime) / 1000;

    if (guessedWinnings === actualWinnings) {
        correctGuesses++;
        document.getElementById("result").textContent = "Your guess is correct!";
        document.body.classList.add('correct');
        setTimeout(() => document.body.classList.remove('correct'), 1000);
    } else {
        document.getElementById("result").textContent = `Your guess is incorrect. The correct winnings are ${actualWinnings} chips.`;
        document.body.classList.add('incorrect');
        setTimeout(() => document.body.classList.remove('incorrect'), 1000);
    }

    let accuracy = (correctGuesses / totalGuesses) * 100;
    let avgTime = totalTime / totalGuesses;
    document.getElementById("performance").textContent = `Performance Metrics:\nAccuracy: ${accuracy.toFixed(2)}%\nAverage Time: ${avgTime.toFixed(2)} seconds`;

    bets = [];  // Clear the bets after checking the guess
    document.getElementById("winningsGuess").value = "";  // Clear the text field for the next guess
    drawTable();  // Redraw the table to clear the chips
    startTime = Date.now();  // Reset the start time for the next round

    if (speedRunActive) {
        randomPick();
    }
}

function startSpeedRun() {
    speedRunActive = true;
    randomPick();
}

function numberPadClick(value) {
    let inputField = document.getElementById("winningsGuess");
    if (value === "Clear") {
        inputField.value = "";
    } else if (value === "Enter") {
        checkGuess();
    } else {
        inputField.value += value;
    }
}

function toggleTheme() {
    document.body.classList.toggle('casino-theme');
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
