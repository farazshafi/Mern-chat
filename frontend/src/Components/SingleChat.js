import React, { useEffect, useState } from 'react'
import { ChatState } from '../Context/ChatProvider'
import { Box, FormControl, IconButton, Input, Spinner, Text, useToast } from '@chakra-ui/react'
import { ArrowBackIcon } from '@chakra-ui/icons'
import { getSender, getSenderFull } from '../config/ChatLogics'
import ProfileModal from './miscellaneous/ProfileModal'
import UpdateGroupChatModal from './miscellaneous/UpdateGroupChatModal'
import axios from 'axios'
import "../style.css"
import ScrollableChat from './ScrollableChat'
import io from "socket.io-client"
import Lottie from "lottie-react"
import animationData from "../animations/typing.json"

const ENDPOINT = "https://chaatiko.onrender.com/"
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)
    const [newMessage, setNewMessage] = useState()
    const [socketConnected, setSocketConnected] = useState(false)
    const [typing, setTyping] = useState(false)
    const [isTyping, setIsTyping] = useState(false)

    const { user, selectedChat, setSelectedChat, notification, setNotification } = ChatState()
    const toast = useToast()

    const fetchMessage = async () => {
        if (!selectedChat) return;
        try {
            setLoading(true)
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            }
            const { data } = await axios.get(`/api/message/${selectedChat._id}`, config)
            setMessages(data)
            setLoading(false)
            socket.emit("join chat", selectedChat._id)
        } catch (error) {
            toast({
                title: 'Error Occured.',
                description: error.data.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            })
        }
    }

    const sendMessage = async (event) => {
        if (event.key === "Enter" && newMessage) {
            socket.emit("stop typing", selectedChat._id)
            try {
                const config = {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${user.token}`
                    }
                }
                setNewMessage("")
                const { data } = await axios.post("/api/message", {
                    content: newMessage,
                    chatId: selectedChat._id
                }, config)
                socket.emit("newMessage", data)
                setMessages([...messages, data])
            } catch (error) {
                toast({
                    title: 'Error Occured.',
                    description: error.data.message,
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                })
            }
        }
    }

    useEffect(() => {
        socket = io(ENDPOINT)
        socket.emit("setup", user)
        socket.on("connected", () => setSocketConnected(true))
        socket.on("typing", () => setIsTyping(true))
        socket.on("stop typing", () => setIsTyping(false))
    }, []);
    useEffect(() => {
        fetchMessage();
        selectedChatCompare = selectedChat;
        // eslint-disable-next-line
    }, [selectedChat]);
    console.log(notification)
    useEffect(() => {
        socket.on("message recieved", (newMessageRecieved) => {
            if (
                !selectedChatCompare || // if chat is not selected or doesn't match current chat
                selectedChatCompare._id !== newMessageRecieved.chat._id
            ) {
                if(!notification.includes(newMessageRecieved)){
                    setNotification([newMessageRecieved, ...notification]);
                    setFetchAgain(!fetchAgain);
                }
            } else {
                setMessages([...messages, newMessageRecieved]);
            }
        });
    });

    const typingHandler = (e) => {
        setNewMessage(e.target.value)
        if (!socketConnected) return;
        if (!typing) {
            setTyping(true)
            socket.emit("typing", selectedChat._id)
        }
        if(!newMessage || newMessage === ""){
            return;
        }
        let lastTypingTime = new Date().getTime()
        let timeLength = 3000
        setTimeout(() => {
            var timeNow = new Date().getTime()
            var timeDifference = timeNow - lastTypingTime
            if (timeDifference >= timeLength && typing) {
                socket.emit("stop typing", selectedChat._id)
                setTyping(false)
            }
        }, timeLength);
    }

    const lottieStyle = {
        width : "70px",
        marginBottom:5,
        marginLeft:0
    }

    return (
        <>
            {selectedChat ? (
                <>
                    <Text
                        fontSize={{ base: "28px", md: "30px" }}
                        pb={3}
                        px={2}
                        w={"100%"}
                        fontFamily={"Work sans"}
                        display={"flex"}
                        justifyContent={{ base: "space-between" }}
                        alignItems={"center"}
                    >
                        <IconButton
                            display={{ base: "flex", md: "none" }}
                            icon={<ArrowBackIcon />}
                            onClick={() => setSelectedChat("")}
                        />
                        {!selectedChat.isGroupChat ?
                            (<>
                                {getSender(user, selectedChat.users)}
                                <ProfileModal user={getSenderFull(user, selectedChat.users)} />
                            </>
                            )
                            :
                            (<>
                                {selectedChat.chatName.toUpperCase()}
                                <UpdateGroupChatModal fetchMessage={fetchMessage} fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
                            </>)
                        }
                    </Text>
                    <Box
                        display="flex"
                        flexDir={"column"}
                        justifyContent={"flex-end"}
                        p={3}
                        width="100%"
                        height="100%"
                        overflow={"hidden"}
                        borderRadius={"lg"}
                    >
                        {loading ?
                            <Spinner
                                size={'xl'}
                                w={20}
                                h={20}
                                alignSelf={'center'}
                                margin={"auto"}
                            />
                            :
                            (
                                <>
                                    <div className='message'>
                                        <ScrollableChat
                                            user={user}
                                            messages={messages}
                                        />
                                    </div>
                                </>
                            )
                        }
                        <FormControl onKeyDown={sendMessage} isRequired mt={3}>
                            {isTyping && (
                                <Lottie
                                    animationData={animationData}
                                    style={lottieStyle}
                                    loop={true}
                                    autoPlay={true}
                                />

                            )}
                            <Input
                                variant={"filled"}
                                background={"#E0E0E0"}
                                placeholder='Enter a message...'
                                onChange={typingHandler}
                                value={newMessage}
                            />
                        </FormControl>
                    </Box>
                </>
            ) : (
                <Box
                    display={"flex"}
                    alignItems={"center"}
                    h="100%"
                    justifyContent={"center"}
                >
                    <Text
                        fontFamily={"Work sans"}
                        pb={3}
                        fontSize={"3xl"}
                    >
                        Click on a user to start chating
                    </Text>
                </Box>
            )
            }
        </>
    )
}

export default SingleChat