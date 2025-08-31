
        let score = 0;
        let level = 1;
        const scoreElement = document.getElementById('score');
        const levelElement = document.getElementById('level');
        const gameContainer = document.getElementById('gameContainer');

        // Configuración del juego
        const bubbleColors = [
            'rgba(255, 182, 193, 0.8)', // Rosa
            'rgba(135, 206, 235, 0.8)', // Azul cielo
            'rgba(255, 255, 224, 0.8)', // Amarillo claro
            'rgba(144, 238, 144, 0.8)', // Verde claro
            'rgba(221, 160, 221, 0.8)', // Púrpura
            'rgba(255, 218, 185, 0.8)', // Melocotón
            'rgba(176, 224, 230, 0.8)'  // Turquesa
        ];

        const pointsValues = [10, 20, 30, 50, 100];

        const baseSpeed = 1;
        const speedIncrement = 0.5;


        const initialBubbles = 10;
        const maxMedusas = 30;

        const bubbles = [];
        const medusas = [];

        function getRandomPosition(size = 60) {
            const margin = 100;
            const x = margin + Math.random() * (window.innerWidth - margin * 2 - size);
            const y = margin + Math.random() * (window.innerHeight - margin * 2 - size);
            return { x, y };
        }

        function createBubble() {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';

            const size = 40 + Math.random() * 60;
            bubble.style.width = size + 'px';
            bubble.style.height = size + 'px';

            const color = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
            bubble.style.background = `radial-gradient(circle at 30% 30%, ${color}, ${color.replace('0.8', '0.4')})`;

            const position = getRandomPosition(size);
            bubble.style.left = position.x + 'px';
            bubble.style.top = position.y + 'px';

            
            const pointsIndex = Math.floor((100 - size) / 20);
            const points = pointsValues[Math.min(pointsIndex, pointsValues.length - 1)];
            bubble.dataset.points = points;


            bubble.style.animationDelay = Math.random() * 3 + 's';

            bubble.addEventListener('click', function (e) {
                e.stopPropagation();
                popBubble(bubble, e);
            });

            gameContainer.appendChild(bubble);

            bubbles.push({
                element: bubble,
                size,
                speedX: (Math.random() - 0.5) * baseSpeed,
                speedY: (Math.random() - 0.5) * baseSpeed
            });
        }

        function createMedusa() {
            const medusa = document.createElement('div');
            medusa.className = 'medusa';
            medusa.style.backgroundImage = "url('../assets/medusa.png')";

            const size = 100;
            medusa.style.width = size + 'px';
            medusa.style.height = size + 'px';

            const position = getRandomPosition(size);
            medusa.style.left = position.x + 'px';
            medusa.style.top = position.y + 'px';

            // Evento click: penaliza puntos
            medusa.addEventListener('click', function (e) {
                e.stopPropagation();
                hitMedusa(medusa, e);
            });

            gameContainer.appendChild(medusa);

            medusas.push({
                element: medusa,
                size,
                speedX: (Math.random() - 0.5) * baseSpeed * 0.7,
                speedY: (Math.random() - 0.5) * baseSpeed * 0.7
            });
        }
        function animateMovement() {
            
            const currentSpeed = baseSpeed + (level - 1) * speedIncrement;

            bubbles.forEach((bubbleObj, index) => {
                const bubble = bubbleObj.element;
                if (bubble.classList.contains('pop-animation')) return; // No mover si explotó

                let x = parseFloat(bubble.style.left);
                let y = parseFloat(bubble.style.top);
                const size = bubbleObj.size;

             
                bubbleObj.speedX = clampSpeed(bubbleObj.speedX, currentSpeed);
                bubbleObj.speedY = clampSpeed(bubbleObj.speedY, currentSpeed);

                x += bubbleObj.speedX;
                y += bubbleObj.speedY;

                
                if (x <= 0 || x >= window.innerWidth - size) {
                    bubbleObj.speedX = -bubbleObj.speedX;
                    x = Math.max(0, Math.min(x, window.innerWidth - size));
                }
                if (y <= 0 || y >= window.innerHeight - size) {
                    bubbleObj.speedY = -bubbleObj.speedY;
                    y = Math.max(0, Math.min(y, window.innerHeight - size));
                }

                bubble.style.left = x + 'px';
                bubble.style.top = y + 'px';
            });

           
            medusas.forEach((medusaObj) => {
                const medusa = medusaObj.element;
                let x = parseFloat(medusa.style.left);
                let y = parseFloat(medusa.style.top);
                const size = medusaObj.size;

               
                const medusaSpeed = (baseSpeed + (level - 1) * speedIncrement) * 0.7;
                medusaObj.speedX = clampSpeed(medusaObj.speedX, medusaSpeed);
                medusaObj.speedY = clampSpeed(medusaObj.speedY, medusaSpeed);

                x += medusaObj.speedX;
                y += medusaObj.speedY;

                
                if (x <= 0 || x >= window.innerWidth - size) {
                    medusaObj.speedX = -medusaObj.speedX;
                    x = Math.max(0, Math.min(x, window.innerWidth - size));
                }
                if (y <= 0 || y >= window.innerHeight - size) {
                    medusaObj.speedY = -medusaObj.speedY;
                    y = Math.max(0, Math.min(y, window.innerHeight - size));
                }

                medusa.style.left = x + 'px';
                medusa.style.top = y + 'px';
            });

            requestAnimationFrame(animateMovement);
        }

        function clampSpeed(speed, maxSpeed) {
            if (speed > maxSpeed) return maxSpeed;
            if (speed < -maxSpeed) return -maxSpeed;
            if (speed > 0 && speed < 0.2) return 0.2;
            if (speed < 0 && speed > -0.2) return -0.2;
            return speed;
        }

        
        function popBubble(bubble, event) {
            const points = parseInt(bubble.dataset.points);
            score += points;
            updateScoreAndLevel();

            
            showPoints(event.clientX, event.clientY, points);

            
            createParticles(event.clientX, event.clientY, bubble.style.background);

            
            bubble.classList.add('pop-animation');

            
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }

            
            setTimeout(() => {
                bubble.remove();
                // Remover del array
                const index = bubbles.findIndex(b => b.element === bubble);
                if (index !== -1) bubbles.splice(index, 1);
                createBubble();
            }, 300);
        }

       
        function hitMedusa(medusa, event) {
            const penalty = 30;
            score -= penalty;
            if (score < 0) score = 0;
            updateScoreAndLevel();

            showPoints(event.clientX, event.clientY, -penalty, true);

         
            if (navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }

            
            medusa.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            medusa.style.transform = 'scale(1.5)';
            medusa.style.opacity = '0.5';

            setTimeout(() => {
                medusa.style.transform = 'scale(1)';
                medusa.style.opacity = '1';
            }, 300);
        }

        
        function showPoints(x, y, points, negative = false) {
            const pointsDiv = document.createElement('div');
            pointsDiv.className = 'points-popup';
            pointsDiv.textContent = (points > 0 ? '+' : '') + points;
            pointsDiv.style.left = x + 'px';
            pointsDiv.style.top = y + 'px';
            pointsDiv.style.color = negative ? '#FF4500' : '#FFD700'; // rojo para negativo

            gameContainer.appendChild(pointsDiv);

            setTimeout(() => {
                pointsDiv.remove();
            }, 1000);
        }

        function createParticles(x, y, color) {
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.background = color;
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';

                const angle = (Math.PI * 2 * i) / 8;
                const velocity = 50 + Math.random() * 50;
                particle.style.setProperty('--x', Math.cos(angle) * velocity + 'px');
                particle.style.setProperty('--y', Math.sin(angle) * velocity + 'px');

                gameContainer.appendChild(particle);

                setTimeout(() => {
                    particle.remove();
                }, 600);
            }
        }

        function updateScoreAndLevel() {
            scoreElement.textContent = `Puntos: ${score}`;
            
            
            const newLevel = Math.floor(score / 200) + 1;
            
            if (newLevel !== level) {
                level = newLevel;
                levelElement.textContent = `Nivel: ${level}`;
                
                // Cambiar color del nivel para indicar subida
                levelElement.style.background = '#FFD700';
                levelElement.style.color = '#000';
                
                setTimeout(() => {
                    levelElement.style.background = 'rgba(255, 255, 255, 0.9)';
                    levelElement.style.color = '#764ba2';
                }, 1000);
            }
        }

      
        function initGame() {
            
            for (let i = 0; i < initialBubbles; i++) {
                setTimeout(() => {
                    createBubble();
                }, i * 500);
            }

            setTimeout(() => {
                for (let i = 0; i < maxMedusas; i++) {
                    setTimeout(() => {
                        createMedusa();
                    }, i * 1500);
                }
            }, 3000);

            
            animateMovement();
        }

        
        setTimeout(() => {
            document.getElementById('instructions').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('instructions').style.display = 'none';
            }, 500);
        }, 8000);

        
        window.addEventListener('load', initGame);

       
        window.addEventListener('resize', () => {
            bubbles.forEach(bubbleObj => {
                const bubble = bubbleObj.element;
                const rect = bubble.getBoundingClientRect();
                if (rect.left < 0) bubble.style.left = '0px';
                if (rect.top < 0) bubble.style.top = '0px';
                if (rect.right > window.innerWidth) bubble.style.left = (window.innerWidth - bubbleObj.size) + 'px';
                if (rect.bottom > window.innerHeight) bubble.style.top = (window.innerHeight - bubbleObj.size) + 'px';
            });

            medusas.forEach(medusaObj => {
                const medusa = medusaObj.element;
                const rect = medusa.getBoundingClientRect();
                if (rect.left < 0) medusa.style.left = '0px';
                if (rect.top < 0) medusa.style.top = '0px';
                if (rect.right > window.innerWidth) medusa.style.left = (window.innerWidth - medusaObj.size) + 'px';
                if (rect.bottom > window.innerHeight) medusa.style.top = (window.innerHeight - medusaObj.size) + 'px';
            });
        });
    

      
const popSound = new Audio('../assets/bubble.mp3');
popSound.volume = 0.3;

// Explotar burbuja
function popBubble(bubble, event) {
    const points = parseInt(bubble.dataset.points);
    score += points;
    updateScoreAndLevel();

 
    showPoints(event.clientX, event.clientY, points);

    
    createParticles(event.clientX, event.clientY, bubble.style.background);

    
    bubble.classList.add('pop-animation');

    
    popSound.currentTime = 0; 
    popSound.play().catch(e => {
       
    });

   
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }

    setTimeout(() => {
        bubble.remove();
        
        const index = bubbles.findIndex(b => b.element === bubble);
        if (index !== -1) bubbles.splice(index, 1);
        createBubble();
    }, 300);
}
