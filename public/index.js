const div = document.querySelector('div')
let socket

div.style.fontFamily = 'monospace'
div.style.fontSize = '1.3em'
div.style.margin = '30px'
div.innerHTML = '<pre style="text-shadow:0px 0px 5px black">\n' +
' ____  _  _  __ _  ____  __    __   ____\n' +
'(  _ \\/ )( \\(  ( \\(  __)/ _\\  / _\\ / ___)\n' +
' )   /) \\/ (/    / ) _)/    \\/    \\\\___ \\\n' +
'(__\\_)\\____/\\_)__)(__) \\_/\\_/\\_/\\_/(____/\n\n</pre>'


const connect = _ => {
    socket = new WebSocket('ws://localhost:3030')
    socket.addEventListener('message', evt => {
        div.innerHTML += `${evt.data.replace('--- Invoking f', 'F').replace(' Function finished in', '')}`
    })
    socket.onclose = _ => {
        console.log('Socket closed. Reconnect in 2 seconds.')
        setTimeout(_ => {
            div.innerHTML += '<span style="color:blue">' + new Date(Date.now()).toString().replace(/\((.+)\)/, '') + 'Reload</span><br>\n'
            connect()
        }, 2000)
    }
}

connect()
