import React from "react"
import { ThemeProvider } from "theme-ui"
import theme from "../components/theme"
import Head from "next/head"

export default ({ Component, props }) => (
    <ThemeProvider theme={theme}>
        <Head>
            <title>DVHS Confessions</title>
        </Head>
        <Component {...props} />
    </ThemeProvider>
)