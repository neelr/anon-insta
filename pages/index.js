import React from "react"
import { Text, Flex, Heading, Link as AL, Button } from "rebass"
import { Input, Textarea } from "@rebass/forms"
import ReCAPTCHA from "react-google-recaptcha";
import axios from "axios"

const A = ({ sx, ...props }) => (
    <AL
        sx={{
            color: "primary",
            ":hover": {
                color: "secondary",
                textDecorationStyle: "wavy"
            },
            ...sx
        }}
        {...props} />
)

export default class extends React.Component {
    recaptchaRefPost = React.createRef();
    recaptchaRefComment = React.createRef();
    state = {
        commentText: "",
        postText: ""
    }
    captchaID = null
    render() {
        return (
            <Flex minHeight="100vh" flexDirection="column" pt="100px">
                <Flex m="auto" flexDirection="column" width={["80vw", "70vw", "60vw"]}>
                    <Heading mx="auto" fontSize={[4, 5, 6]}>DVHS Confessions</Heading>
                    <Text mx="auto" fontWeight={100}>Secure, Safe, and Fast Confessions</Text>
                    <Text>Hi! So the way this works, is that there is a script that automatically lets you post confessions and reply to them anonymously! But don't abuse this because <strong>we can still ban you.</strong> The way this works is that we store your hashed IP (Hashing is a one way operation that is mathematically impossible to break. That way, we won't be able to reverse your actual IP or location), to identify you so you can have unique names in comments, be known as the OP, and be banned from the bot with a simple click. Check out <A href="https://instagram.com">the instagram account!</A></Text>
                    <Flex as="form" flexDirection="column" sx={{ borderBottom: "5px solid", borderColor: "primary", pb: "10px" }} onSubmit={e => {
                        e.preventDefault()
                        this.setState({ postText: "Loading..." })
                        axios.post("/api/post", {
                            body: document.getElementById("post").value,
                            name: document.getElementById("postName").value,
                            captcha: this.recaptchaRefPost.current.getValue()
                        }).then(d => {
                            if (d.status != 200) {
                                this.setState({
                                    postText: "Error! Fill out Captcha!"
                                })
                                return;
                            }
                            this.setState({
                                postText: "Done!"
                            })
                        }).catch(e => this.setState({
                            postText: "Error! Fill out Captcha!"
                        }))
                    }}>
                        <Text mt="15px" fontWeight={700} mx="auto">{this.state.postText}</Text>
                        <Textarea id="post" placeholder="Post Text" sx={{ borderRadius: "5px", m: "15px" }} />
                        <Input id="postName" placeholder="Name/Nickname/Alias" sx={{ borderRadius: "5px", m: "15px" }} />
                        <Flex mx="auto" my="10px">
                            <ReCAPTCHA
                                sitekey="6Leiof0UAAAAAFMnmTUuLHZNVpZjR1bhmwjD1zEi"
                                ref={this.recaptchaRefPost}
                            />
                        </Flex>
                        <Button mx="auto" sx={{ ":hover": { bg: "secondary", cursor: "pointer" } }}>Submit Post!</Button>
                    </Flex>
                    <Flex as="form" flexDirection="column" onSubmit={e => {
                        e.preventDefault()
                        this.setState({ commentText: "Loading..." })
                        axios.post("/api/comment", {
                            body: document.getElementById("comment").value,
                            postNumber: document.getElementById("commentNum").value,
                            captcha: this.recaptchaRefComment.current.getValue()
                        }).then(d => {
                            if (d.status != 200) {
                                this.setState({
                                    commentText: "Error! Fill out Captcha!"
                                })
                                return;
                            }
                            this.setState({
                                commentText: "Done!"
                            })
                        }).catch(e => this.setState({
                            commentText: "Error! Fill out Captcha!"
                        }))
                    }}>
                        <Text mt="15px" fontWeight={700} mx="auto">{this.state.commentText}</Text>
                        <Textarea id="comment" placeholder="Comment Text" sx={{ borderRadius: "5px", m: "15px" }} required />
                        <Input id="commentNum" placeholder="Post Number" type="number" sx={{ borderRadius: "5px", m: "15px" }} required />
                        <Flex mx="auto" my="10px">
                            <ReCAPTCHA
                                sitekey="6Leiof0UAAAAAFMnmTUuLHZNVpZjR1bhmwjD1zEi"
                                ref={this.recaptchaRefComment}
                            />
                        </Flex>
                        <Button mx="auto" sx={{ ":hover": { bg: "secondary", cursor: "pointer" } }}>Submit Comment!</Button>
                    </Flex>
                </Flex>
                <Flex my="50px">
                    <Text m="auto">Made with ☕ by <A href="https://neelr.dev">@neelr</A> | <A href="https://github.com/neelr/anon-insta">Source Code</A></Text>
                </Flex>
            </Flex >
        )
    }
}