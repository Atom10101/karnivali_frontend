import React, { useState, useEffect } from 'react';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import { Modal, Button } from "react-bootstrap";
import { RockPaperScissorBackground, Slot, Rock, Paper, Scissor, ChatButton, chatModalButton } from "../styles/RockPaperScissors.styles";
import { useHistory } from 'react-router-dom';
import ChatModal from 'react-modal'
import chatImg from '../images/chat_button_img.svg'

import useSound from 'use-sound';
import youWin from '../sounds/8youWin.mp3';
import youLose from '../sounds/9youLose.mp3';
import youTie from '../sounds/10youTied.mp3';
import gameSelect from '../sounds/11gameSelect.mp3';
import playAgain from '../sounds/12playAgain.mp3';
import waitOpponent from '../sounds/13waitForOpponent.wav';

import pressButton from '../sounds/24comBeep.mp3';
import pressRock from '../sounds/22powerUp.mp3';
import pressPaper from '../sounds/25powerUp.mp3';
import pressScissors from '../sounds/23powerUp.mp3';


let currentTurn = true
let userChoices = {}
let resetGamePlayers = {}
let chat_messages = ""

export default function RockPaperScissor(props) {
    console.log(props)

    // const [rock, setRock] = useState('rock')
    // const [paper, setPaper] = useState('paper')
    // const [scissor, setScissor] = useState('scissor')
    const [modalIsopen, setModalIsOpen] = useState(false)

    const [isChatModalOpen, setChatModalOpen] = useState(false)
    const [chatMsg, setChatMsg] = useState("")
    const [msgs, setMsgs] = useState("")

    let socket = new W3CWebSocket('ws://karnivali.herokuapp.com/ws/game/rps/' + props.location.state.roomCode)

    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);

    const [isOver, setIsOver] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (isOver) {
            setShow(true);
        }
    }, [isOver]);


    // getting sounds setup
    const [playerWon] = useSound(youWin);
    const [playerLost] = useSound(youLose);
    const [playerTied] = useSound(youTie);
    const [goGameSelect] = useSound(gameSelect);
    const [goPlayAgain] = useSound(playAgain);
    const [playerWait] = useSound(waitOpponent);

    const [gameButton] = useSound(pressButton, { volume: 0.05 });
    const [chooseRock] = useSound(pressRock);
    const [choosePaper] = useSound(pressPaper, { volume: 0.2 });
    const [chooseScissors] = useSound(pressScissors);


    const history = useHistory();

    const routeChange = () => { //for end of game
        resetGame();
        let path = 'game-selection';
        const userDetails = {
            username: localStorage.getItem("username"),
            isGuest: localStorage.getItem("isGuest")
        }
        history.push(path, userDetails);
    }

    useEffect(() => {
        socket.onopen = function () {
            console.log('Socket connected')
        }

        console.log(userChoices);

        socket.onmessage = function (e) {
            var data = JSON.parse(e.data).payload
            console.log(data)

            if (data.msg_type !== undefined) {
                chat_messages += data.player + ':' + data.chatMsg + '\n'
                setMsgs(chat_messages)
            }

            if (data.reset === "reset") {
                resetGamePlayers[data.player] = data.reset;
                checkForResetOrNewGame();
                return;
            }
            if (data.reset === "change") {
                routeChange();
                return;
            }

            if (props.location.state.player == "viewer") {

                if (data.state === 'p1') {
                    alert("Player one wins.")
                    return
                } else if (data.state === 'p2') {
                    alert("Player two wins.")
                    return
                } else if (data.state === 'draw') {
                    alert("Game drawn.")
                    return
                }
            }

            if (data.state === "draw") {
                setModalIsOpen(true)
                setMessage("Draw!");
                playerTied();
                currentTurn = true
                setIsOver(true);
                return
            } else if (data.state === props.location.state.player) {
                currentTurn = true
                setMessage("You won!");
                playerWon();
                setIsOver(true);
                return
            } else if ((data.state === 'p2' && props.location.state.player === 'p1') || (data.state === 'p1' && props.location.state.player === 'p2')) {
                currentTurn = true
                setMessage("You lost!");
                playerLost();
                setIsOver(true);
                return
            }

            userChoices[data['player']] = data.value
            console.log(userChoices)

            let state = 'continue'

            if (userChoices.p1 !== undefined && userChoices.p2 !== undefined) {
                if (userChoices.p1 === userChoices.p2) {
                    state = 'draw'
                    setMessage("draw");
                    setIsOver(true);
                } else if (userChoices.p1 === 'rock' && userChoices.p2 === 'scissor') {
                    state = "p1"
                } else if (userChoices.p1 === 'paper' && userChoices.p2 === 'rock') {
                    state = "p1"
                } else if (userChoices.p1 === 'scissor' && userChoices.p2 === 'paper') {
                    state = "p1"
                } else {
                    state = "p2"
                }
            }
        }

        socket.onclose = function () {
            console.log('Socket Closed')
        }

    }, [])

    function sendData(value, player) {
        if (props.location.state.player == "viewer") {
            alert("Well, that would be cheating...")
            playerWait()
            return;
        }
        console.log(userChoices)

        if (currentTurn == false) {
            alert("Please wait for your opponent's turn!")
            playerWait()
            return
        } else {
            currentTurn = false
        }

        userChoices[player] = value
        let state = 'progress'

        if (userChoices.p1 !== undefined && userChoices.p2 !== undefined) {

            if (userChoices.p1 === userChoices.p2) {
                state = 'draw'
                setMessage("draw");
                setIsOver(true);
            } else if (userChoices.p1 === 'rock' && userChoices.p2 === 'scissor') {
                state = "p1"
            } else if (userChoices.p1 === 'paper' && userChoices.p2 === 'rock') {
                state = "p1"
            } else if (userChoices.p1 === 'scissor' && userChoices.p2 === 'paper') {
                state = "p1"
            } else {
                state = "p2"
            }
        }

        let reset = '';
        sendMessage(socket, JSON.stringify({
            value,
            player,
            state,
            reset
        }))
        //socket.send(JSON.stringify({value,player,state,reset}))
    }

    function resetGame() {
        console.log('reset game');
        userChoices = {};
        resetGamePlayers = {};
        currentTurn = true;
        if (show) {
            setShow(!show);
        }
        setIsOver(false);
        console.log(userChoices);
    }

    function selectResetGame() {
        let reset = 'reset';
        let player = props.location.state.player;
        resetGamePlayers[player] = reset;
        sendMessage(socket, JSON.stringify({
            reset,
            player
        }))
        //socket.send(JSON.stringify({ reset, player}))
        checkForResetOrNewGame();
        if (show) {
            setShow(!show);
        }
    }

    function selectRouteChange() {
        let reset = 'change';
        let player = props.location.state.player;
        resetGamePlayers[player] = reset;
        sendMessage(socket, JSON.stringify({
            reset,
            player,
        }))
        //socket.send(JSON.stringify({reset,player,}))

        routeChange();
    }

    const waitForOpenConnection = (socket) => {
        return new Promise((resolve, reject) => {
            const maxNumberOfAttempts = 100
            const intervalTime = 200 //ms

            let currentAttempt = 0
            const interval = setInterval(() => {
                if (currentAttempt > maxNumberOfAttempts - 1) {
                    clearInterval(interval)
                    reject(new Error('Maximum number of attempts exceeded'))
                } else if (socket.readyState === socket.OPEN) {
                    clearInterval(interval)
                    resolve()
                }
                currentAttempt++
            }, intervalTime)
        })
    }

    const sendMessage = async (socket, msg) => {
        if (socket.readyState !== socket.OPEN) {
            try {
                await waitForOpenConnection(socket)
                socket.send(msg)
            } catch (err) { console.error(err) }
        } else {
            socket.send(msg)
        }
    }

    function checkForResetOrNewGame() {
        if (resetGamePlayers.p1 !== undefined && resetGamePlayers.p2 !== undefined) {
            if (resetGamePlayers.p1 === "reset" && resetGamePlayers.p2 === "reset") {
                console.log("resetting")
                resetGame();
            } else {
                console.log("routing")
                routeChange();
            }
        }
    }

    function sendChatData(player) {
        sendMessage(socket, JSON.stringify({
            msg_type: "chat_msg",
            player,
            chatMsg
        }))
        //socket.send(JSON.stringify({msg_type: "chat_msg",player,chatMsg }))

        setChatMsg("")
    }

    return (
        <>
            <Modal show={show} onHide={handleClose}>
                <Modal.Title>{message}</Modal.Title>
                <Modal.Footer>
                    <Button 
                        variant="primary" 
                        onClick={selectResetGame}
                        onMouseEnter={() => {
                            goPlayAgain();
                        }}
                        >
                        Play again
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={selectRouteChange}
                        onMouseEnter={() => {
                            goGameSelect();
                        }}
                        >
                        Game Select Screen
                    </Button>
                </Modal.Footer>
            </Modal>
            <RockPaperScissorBackground>
                <RockPaperScissorBackground>
                <Slot 
                    hoverColor='#ff124f' 
                    onClick={() => { sendData('rock', props.location.state.player) }}
                    onMouseEnter={() => {
                        chooseRock();
                    }}
                    ><Rock>🧱</Rock></Slot>

                <Slot 
                    hoverColor='#7a04eb' 
                    onClick={() => { sendData('paper', props.location.state.player) }}
                    onMouseEnter={() => {
                        choosePaper();
                    }}
                    ><Paper>📜</Paper></Slot>

                <Slot 
                    hoverColor='#ff00a0' 
                    onClick={() => { sendData('scissor', props.location.state.player) }}
                    onMouseEnter={() => {
                        chooseScissors();
                    }}
                    ><Scissor>✂️</Scissor></Slot>

                </RockPaperScissorBackground>
                <ChatButton 
                    onClick={(e) => { setChatModalOpen(true) }}
                    onMouseEnter={() => {
                        gameButton();
                    }}
                    ><img src={chatImg}  width='80em'></img></ChatButton>
                <ChatModal
                    isOpen={isChatModalOpen}
                    style={{
                        
                        overlay: {
                            width: '500px',
                            height: '700px',
                            padding: '0px',
                            top: '0px',
                            borderRadius: '30px'
                        },
                        content: {
                            padding: '10px',
                            backgroundColor: 'transparent',
                            border: 'none'
                        }
                    }}

                // portalClassName={ } // Can mention the class name from .css class.

                >
                    <textarea id="chat_area" cols="50" rows="20" value={msgs} style={{ borderRadius: '15px', padding: '5px', backgroundColor: 'rgb(122, 4, 235, 0.4)', border:'none', color:"#120458" }}></textarea><br></br>
                    <input type="text" id="chat_input" placeholder="Type here"
                        value={chatMsg}
                        onChange={(e) => { setChatMsg(e.target.value) }}
                        style={{ borderRadius: '12px', margin: '3px', width:'65%', border:'none', backgroundColor: 'rgb(122, 4, 235, 0.5)', color:"#120458", padding: '5px', fontWeight:'bold' }}
                        onKeyPress={(e) => { if (e.key === 'Enter') sendChatData(props.location.state.player) }}>
                    </input>
                    <button
                        onClick={() => { sendChatData(props.location.state.player) }}
                        style={{ backgroundColor: 'whitesmoke', borderRadius: '30px', width:'33%', border:'solid 2px #120458', color:'#120458', fontWeight:'bold', padding: '5px', }}
                        // break button out in styled components
                        >
                        Send
                    </button>
                    <br></br>
                    
                    <button onClick={() => { setChatModalOpen(false) }} style={{ backgroundColor: 'whitesmoke', borderRadius: '30px', margin: '3px', border:'solid 2px #ff124f', width:'98%', color:'#ff124f', fontWeight:'bold', padding: '5px', paddingTop: '12px', paddingBottom: '12px',marginTop: '5px' }}>Close Chat</button>
                        
                </ChatModal>

            </RockPaperScissorBackground>
        </>
    )
}
