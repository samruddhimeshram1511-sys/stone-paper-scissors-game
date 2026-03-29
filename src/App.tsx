/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hand, Scissors, Circle, RotateCcw, XCircle, Trophy, User, Monitor, Brain, Loader2, Volume2, VolumeX } from 'lucide-react';
import { predictUserMove } from './services/geminiService';

// Sound effect URLs
const SOUNDS = {
  CLICK: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  REVEAL: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  WIN: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  LOSE: 'https://assets.mixkit.co/active_storage/sfx/251/251-preview.mp3',
  DRAW: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
};

type Choice = 'stone' | 'paper' | 'scissors';
type Result = 'user' | 'computer' | 'draw' | null;
type GameMode = 'single' | 'bestOf3';

// Custom Hand Components for better visual representation
const StoneHand = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    {/* Green Circle Background from Image */}
    <circle cx="50" cy="50" r="48" fill="#7CFF00" stroke="#004D00" strokeWidth="4" />
    
    {/* Front-facing Fist Shape */}
    <path 
      d="M25,60 
         C20,60 18,50 20,40 
         C22,30 30,25 40,25 
         L60,25 
         C70,25 78,30 80,40 
         C82,50 80,60 75,65 
         L75,75 
         C75,82 65,85 50,85 
         C35,85 25,82 25,75 
         Z" 
      fill="#FCE4C4" 
      stroke="black" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Knuckles/Fingers detail */}
    <path d="M38,25 L38,60" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" />
    <path d="M52,25 L52,60" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" />
    <path d="M66,25 L66,60" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" />
    
    {/* Thumb detail at bottom */}
    <path 
      d="M50,60 
         C50,60 75,58 82,65 
         C88,72 75,80 50,80 
         C35,80 30,75 30,75" 
      fill="#FCE4C4" 
      stroke="black" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
  </svg>
);

const PaperHand = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    {/* Blue Circle Background */}
    <circle cx="50" cy="50" r="48" fill="#3ABEF9" stroke="black" strokeWidth="2.5" />
    
    {/* Hand Shape - Cartoonish open hand */}
    <path 
      d="M50,85 
         C30,85 24,75 24,60 
         C24,55 20,50 20,40 
         C20,32 28,32 28,40 
         L28,55 
         L38,30 
         C38,22 46,22 46,30 
         L46,55 
         L56,25 
         C56,17 64,17 64,25 
         L64,55 
         L74,30 
         C74,22 82,22 82,30 
         L82,55 
         C82,55 85,58 92,55 
         C98,52 98,65 90,70 
         C85,80 70,85 50,85" 
      fill="#FCE4C4" 
      stroke="black" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

const ScissorsHand = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    {/* Purple Circle Background */}
    <circle cx="50" cy="50" r="48" fill="#A855F7" stroke="black" strokeWidth="2.5" />
    
    {/* Hand Shape - Scissors/Peace sign */}
    <path 
      d="M50,85 
         C30,85 24,75 24,60 
         C24,55 20,50 20,40 
         C20,32 28,32 28,40 
         L28,55 
         L38,20 
         C38,10 48,10 48,20 
         L48,50 
         L62,20 
         C62,10 72,10 72,20 
         L72,50 
         C72,50 75,55 82,50 
         C88,45 92,55 85,65 
         C80,75 70,85 50,85" 
      fill="#FCE4C4" 
      stroke="black" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Folded fingers detail */}
    <path 
      d="M48,50 C48,50 55,60 72,50" 
      fill="none" 
      stroke="black" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
  </svg>
);

const choices: { id: Choice; icon: React.ElementType; label: string; description: string }[] = [
  { 
    id: 'stone', 
    icon: StoneHand, 
    label: 'Stone', 
    description: 'A closed fist' 
  },
  { 
    id: 'paper', 
    icon: PaperHand, 
    label: 'Paper', 
    description: 'An open hand' 
  },
  { 
    id: 'scissors', 
    icon: ScissorsHand, 
    label: 'Scissors', 
    description: 'Index and middle fingers open' 
  },
];

export default function App() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [userChoice, setUserChoice] = useState<Choice | null>(null);
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState({ user: 0, computer: 0 });
  const [seriesWinner, setSeriesWinner] = useState<Result>(null);
  const [history, setHistory] = useState<Choice[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const playSound = (url: string) => {
    if (isMuted) return;
    const audio = new Audio(url);
    audio.volume = 0.4;
    audio.play().catch(err => console.error("Sound play error:", err));
  };

  const determineWinner = (user: Choice, computer: Choice): Result => {
    if (user === computer) return 'draw';
    if (
      (user === 'stone' && computer === 'scissors') ||
      (user === 'paper' && computer === 'stone') ||
      (user === 'scissors' && computer === 'paper')
    ) {
      return 'user';
    }
    return 'computer';
  };

  const getCounterMove = (predictedMove: string): Choice => {
    // Difficulty settings:
    // Easy: 30% counter, 70% random
    // Medium: 60% counter, 40% random
    // Hard: 90% counter, 10% random
    const counterProb = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.6 : 0.9;
    const shouldCounter = Math.random() < counterProb;
    
    if (shouldCounter) {
      if (predictedMove === 'stone') return 'paper';
      if (predictedMove === 'paper') return 'scissors';
      if (predictedMove === 'scissors') return 'stone';
    }
    
    // Fallback to random move
    return choices[Math.floor(Math.random() * choices.length)].id;
  };

  const handleUserChoice = async (choice: Choice) => {
    if (isGameOver || seriesWinner || isThinking || isPlaying) return;

    playSound(SOUNDS.CLICK);
    setIsThinking(true);
    setIsPlaying(true);
    setUserChoice(null);
    setComputerChoice(null);
    
    try {
      // Run Gemini prediction and the bounce animation timer in parallel
      // This makes the game feel much faster as the robot thinks while the hands bounce
      const [predictedUserMove] = await Promise.all([
        predictUserMove(history),
        new Promise(resolve => setTimeout(resolve, 800)) // 0.4s * 2 repeats = 0.8s
      ]);

      const compChoice = getCounterMove(predictedUserMove);
      const gameResult = determineWinner(choice, compChoice);

      playSound(SOUNDS.REVEAL);
      
      // Small delay to sync sound with visual reveal
      setTimeout(() => {
        if (gameResult === 'user') playSound(SOUNDS.WIN);
        else if (gameResult === 'computer') playSound(SOUNDS.LOSE);
        else playSound(SOUNDS.DRAW);
      }, 100);

      setUserChoice(choice);
      setComputerChoice(compChoice);
      setResult(gameResult);
      setIsGameOver(true);
      setIsPlaying(false);

      // Update history with the NEW choice for future predictions
      setHistory((prev) => [...prev, choice]);

      let newUserScore = score.user;
      let newComputerScore = score.computer;

      if (gameResult === 'user') {
        newUserScore += 1;
        setScore((prev) => ({ ...prev, user: newUserScore }));
      } else if (gameResult === 'computer') {
        newComputerScore += 1;
        setScore((prev) => ({ ...prev, computer: newComputerScore }));
      }

      if (newUserScore === 2) {
        setSeriesWinner('user');
      } else if (newComputerScore === 2) {
        setSeriesWinner('computer');
      }
    } catch (error) {
      console.error("Game Error:", error);
      const compChoice = choices[Math.floor(Math.random() * choices.length)].id;
      const gameResult = determineWinner(choice, compChoice);
      setUserChoice(choice);
      setComputerChoice(compChoice);
      setResult(gameResult);
      setIsGameOver(true);
      setIsPlaying(false);
    } finally {
      setIsThinking(false);
    }
  };

  const resetGame = () => {
    setUserChoice(null);
    setComputerChoice(null);
    setResult(null);
    setIsGameOver(false);
    setIsPlaying(false);
    if (seriesWinner) {
      setSeriesWinner(null);
      setScore({ user: 0, computer: 0 });
      setHistory([]);
    }
  };

  const quitGame = () => {
    setScore({ user: 0, computer: 0 });
    setGameMode(null);
    setSeriesWinner(null);
    setHistory([]);
    resetGame();
  };

  const getResultText = () => {
    if (seriesWinner) {
      return seriesWinner === 'user' ? "YOU WON! 🏆✨" : "ROBOT WON! 🤖";
    }
    if (result === 'draw') return "IT'S A TIE! 🤝";
    if (result === 'user') return "YOU GOT IT! 🌟";
    if (result === 'computer') return "ROBOT GOT IT! 🤖";
    return "";
  };

  const bounceAnimation = {
    y: [0, -40, 0],
    transition: {
      duration: 0.4,
      repeat: 2,
      ease: "easeInOut"
    }
  };

  const getChoiceAnimation = (choiceId: Choice | null) => {
    if (!choiceId || isPlaying) return {};
    
    switch (choiceId) {
      case 'stone':
        return {
          x: [0, -1, 1, -1, 1, 0],
          transition: { duration: 0.2, repeat: 3, ease: "linear" }
        };
      case 'paper':
        return {
          rotate: [-1, 1, -1],
          y: [0, -2, 0],
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        };
      case 'scissors':
        return {
          scale: [1, 1.1, 1],
          rotate: [0, -5, 5, 0],
          transition: { duration: 0.4, repeat: 2, ease: "easeInOut" }
        };
      default:
        return {};
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-yellow-300 via-orange-400 to-pink-500 text-neutral-900 font-playful flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white/95 backdrop-blur-md rounded-[3rem] shadow-2xl overflow-hidden border-4 border-white/50">
        {/* Header */}
        <div className="bg-blue-500 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#ffffff_2px,transparent_2px)] bg-[length:30px_30px]"></div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2 flex items-center justify-center gap-3 drop-shadow-lg">
            <Brain className="text-yellow-300 animate-bounce" size={40} />
            SUPER ROBOT CHALLENGE! 🤖
          </h1>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="absolute top-6 right-6 p-3 text-white/80 hover:text-white transition-colors bg-white/20 rounded-full backdrop-blur-md"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
          <p className="text-yellow-200 text-xs font-bold uppercase tracking-[0.4em] drop-shadow-md">
            First to 2 Wins! 🏆
          </p>
        </div>

        {!gameMode ? (
          <div className="p-10 text-center space-y-8">
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 bg-yellow-100 rounded-full animate-pulse">
                <Brain className="text-yellow-600" size={48} />
              </div>
              <h2 className="text-3xl font-bold text-neutral-800">Ready for Fun? ✨</h2>
              <p className="text-neutral-500 text-lg max-w-md mx-auto">
                Can you beat our super smart robot? It's learning from you! 🧠
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setGameMode('bestOf3')}
                className="px-12 py-8 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full hover:scale-110 hover:shadow-[0_20px_50px_rgba(34,197,94,0.4)] transition-all group w-full max-w-sm border-4 border-white/30"
              >
                <div className="text-3xl font-black tracking-tight text-center uppercase">PLAY NOW! 🚀</div>
                <div className="text-sm text-white/80 font-bold uppercase tracking-widest text-center mt-1">Best of 3 Rounds</div>
              </button>
            </div>

            {/* Difficulty Selector */}
            <div className="pt-4">
              <p className="text-xs text-neutral-400 font-black uppercase tracking-[0.3em] mb-6">Choose Your Challenge! 🌈</p>
              <div className="flex justify-center gap-4">
                {(['easy', 'medium', 'hard'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`
                      px-8 py-3 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all border-4
                      ${difficulty === level 
                        ? 'bg-yellow-400 text-white border-yellow-500 shadow-xl scale-110' 
                        : 'bg-neutral-100 text-neutral-400 border-transparent hover:bg-neutral-200'
                      }
                    `}
                  >
                    {level === 'easy' ? 'Easy 🐣' : level === 'medium' ? 'Medium 🦊' : 'Hard 🐉'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Scoreboard */}
            <div className="flex justify-around items-center p-6 border-b-4 border-neutral-100 bg-yellow-50/50 backdrop-blur-md">
              <div className="text-center group">
                <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                  <User size={18} className="animate-bounce" />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">YOU 🧒</span>
                </div>
                <div className="text-5xl font-black tracking-tight text-green-600 drop-shadow-sm">{score.user}</div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-1 h-16 bg-neutral-200 rounded-full"></div>
                <div className="px-4 py-2 bg-pink-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full -mt-8 z-10 shadow-lg border-2 border-white">VS</div>
              </div>

              <div className="text-center group">
                <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                  <Brain size={18} className="animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">ROBOT 🤖</span>
                </div>
                <div className="text-5xl font-black tracking-tight text-blue-600 drop-shadow-sm">{score.computer}</div>
              </div>
            </div>

            {/* Game Area */}
            <div className="p-8 md:p-12 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                
                {/* User Side */}
                <div className="flex flex-col items-center gap-4">
                  <h2 className="text-xs font-black text-neutral-400 uppercase tracking-[0.3em]">Pick Your Move! ✨</h2>
                  
                  {isPlaying || isGameOver || seriesWinner ? (
                    <div className="w-40 h-40 flex items-center justify-center bg-blue-50 rounded-full border-4 border-blue-100">
                      <motion.div
                        animate={isPlaying ? bounceAnimation : getChoiceAnimation(userChoice)}
                        className="text-neutral-900"
                      >
                        {userChoice ? (
                          (() => {
                            const choice = choices.find(c => c.id === userChoice);
                            return choice ? <choice.icon className="w-28 h-28" /> : null;
                          })()
                        ) : (
                          <StoneHand className="w-28 h-28" />
                        )}
                      </motion.div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      {choices.map((choice) => (
                        <motion.button
                          key={choice.id}
                          onClick={() => handleUserChoice(choice.id)}
                          disabled={isGameOver || !!seriesWinner || isThinking || isPlaying}
                          whileHover={!(isGameOver || seriesWinner || isThinking || isPlaying) ? { 
                            scale: 1.15, 
                            rotate: 5,
                            boxShadow: "0 20px 40px -10px rgba(59, 130, 246, 0.3)"
                          } : {}}
                          whileTap={!(isGameOver || seriesWinner || isThinking || isPlaying) ? { scale: 0.9 } : {}}
                          className={`
                            group relative flex flex-col items-center justify-center w-24 h-24 rounded-full transition-all duration-300 border-4
                            ${userChoice === choice.id 
                              ? 'bg-blue-500 text-white border-blue-600 scale-110 shadow-xl' 
                              : (isGameOver || seriesWinner || isThinking || isPlaying)
                                ? 'bg-neutral-100 text-neutral-300 border-neutral-200 cursor-not-allowed' 
                                : 'bg-white border-neutral-100 hover:border-blue-400 hover:bg-blue-50'
                            }
                          `}
                        >
                          <choice.icon className="w-14 h-14" />
                          <div className={`absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-blue-500`}>
                            {choice.label}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Robot Side */}
                <div className="flex flex-col items-center gap-4">
                  <h2 className="text-xs font-black text-neutral-400 uppercase tracking-[0.3em]">Robot's Move! 🤖</h2>
                  <div className="w-40 h-40 flex items-center justify-center bg-pink-50 rounded-full border-4 border-pink-100">
                    <AnimatePresence mode="wait">
                      {isThinking && !isPlaying ? (
                        <motion.div
                          key="thinking"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex flex-col items-center gap-2"
                        >
                          <Brain className="w-16 h-16 text-pink-400 animate-spin" />
                          <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Thinking...</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={computerChoice || 'idle'}
                          animate={isPlaying ? bounceAnimation : getChoiceAnimation(computerChoice)}
                          className="text-neutral-900"
                        >
                          {computerChoice ? (
                            (() => {
                              const choice = choices.find(c => c.id === computerChoice);
                              return choice ? <choice.icon className="w-28 h-28 scale-x-[-1]" /> : null;
                            })()
                          ) : (
                            <StoneHand className="w-28 h-28 scale-x-[-1]" />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Result Overlay */}
              <AnimatePresence>
                {(isGameOver || seriesWinner) && !isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="mt-12 text-center space-y-8"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.3, 1],
                          rotate: [0, 10, -10, 0]
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        {(result === 'user' || seriesWinner === 'user') && <Trophy className="text-yellow-400" size={64} />}
                      </motion.div>
                      <h3 className={`text-6xl font-black uppercase tracking-tight drop-shadow-md ${
                        (result === 'user' || seriesWinner === 'user') ? 'text-green-500' : (result === 'computer' || seriesWinner === 'computer') ? 'text-pink-500' : 'text-neutral-400'
                      }`}>
                        {getResultText()}
                      </h3>
                      {!seriesWinner && isGameOver && (
                        <p className="text-neutral-400 font-black uppercase tracking-[0.3em] text-sm">
                          {result === 'draw' ? 'Try again! 🤝' : result === 'user' ? 'You got this! 🌟' : 'Robot is winning! 🤖'}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      <button
                        onClick={resetGame}
                        className="flex items-center gap-3 px-12 py-6 bg-green-500 text-white rounded-full font-black uppercase tracking-[0.2em] hover:bg-green-600 transition-all shadow-xl hover:shadow-[0_20px_40px_rgba(34,197,94,0.3)] active:scale-95 text-lg border-4 border-white/30"
                      >
                        <RotateCcw size={24} />
                        {seriesWinner ? 'PLAY AGAIN! 🎮' : 'NEXT ROUND! ➡️'}
                      </button>
                      <button
                        onClick={quitGame}
                        className="flex items-center gap-3 px-12 py-6 bg-white border-4 border-neutral-100 text-neutral-400 rounded-full font-black uppercase tracking-[0.2em] hover:border-pink-400 hover:text-pink-400 transition-all active:scale-95 text-lg"
                      >
                        <XCircle size={24} />
                        QUIT 🏠
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Footer Info */}
        <div className="p-2 bg-neutral-50 border-t border-neutral-100 text-center">
          <p className="text-[9px] text-neutral-400 uppercase tracking-[0.2em]">
            Advanced Robot Opponent • Learning from {history.length} games
          </p>
        </div>
      </div>
    </div>
  );
}
