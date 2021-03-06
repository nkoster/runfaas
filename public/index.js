const div = document.querySelector('div')
let socket


div.style.fontFamily = 'monospace'
div.style.fontSize = '1.4em'
div.style.margin = '30px'
div.innerHTML = '<pre style="text-shadow:0px 0px 5px black">\n' +
' ____  _  _  __ _  ____  __    __   ____\n' +
'(  _ \\/ )( \\(  ( \\(  __)/ _\\  / _\\ / ___)\n' +
' )   /) \\/ (/    / ) _)/    \\/    \\\\___ \\\n' +
'(__\\_)\\____/\\_)__)(__) \\_/\\_/\\_/\\_/(____/\n\n</pre>'


const setWarningColor = msg => {
    let style = ''
    let warning = false
    if (msg.toLowerCase().includes('not valid')) warning = true
    if (msg.toLowerCase().includes('invalid')) warning = true
    if (msg.toLowerCase().includes('error')) warning = true
    if (msg.toLowerCase().includes('warning')) warning = true
    if (msg.toLowerCase().includes('no token')) warning = true
    if (msg.toLowerCase().includes('not verify')) warning = true
    if (warning) {
        style = ' style="color:red"'
    }
    return style
}

const connect = _ => {
    socket = new WebSocket(`wss://${location.hostname}`)
    socket.addEventListener('message', evt => {
        div.innerHTML += `<span${setWarningColor(evt.data)}>${evt.data.replace('--- Invoking f', 'F').replace(' Function finished in', '')}</span><br>\n`
        window.scrollTo(0,document.body.scrollHeight)
    })
    socket.onclose = _ => setTimeout(_ => connect(), 1000)
}

connect()
