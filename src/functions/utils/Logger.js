const couleur = require('chalk');
const dayjs = require("dayjs");

const formats = "{tStamp} {tag} {txt}\n"

function write(content, tagColor = 'white', tag = '', error = false) {
    const timestamp = `[${dayjs().format('DD/MM - HH:mm:ss')}]`;
    const stream = error ? process.stderr : process.stdout;
    let styledTag;

    if (tagColor.startsWith('#')) {
        styledTag = couleur.hex(tagColor).bold(tag);
    } else if (couleur[tagColor]) {
        styledTag = couleur[tagColor].bold(tag);
    } else {
        styledTag = couleur.bold(tag);
    }

    // Remplacement dans le format
    const formattedMessage = formats
        .replace('{tStamp}', couleur.gray(timestamp))
        .replace('{tag}', styledTag)
        .replace('{txt}', couleur.white(content));

    stream.write(formattedMessage);
}

function error(content) {
    write(content, "red", "ERREUR", true);
}

function command(content) {
    write(content, "blue", "CMD");
}

function warn(content) {
    write(content, "yellow", "WARN");
}

function event(content) {
    write(content, "#fc852b", "EVT");
}

function clientStart(content) {
    write(content, "green", "CLIENT");
}

function slashCommand(content) {
    write(content, "cyan", "SLASH COMMAND");
}

function log(content) {
    write(content, "#804aba", "LOG");
}

function test(content) {
    write(content, "gray", "TEST");
}

module.exports =  { error, warn, command, event, clientStart, slashCommand, log, test };