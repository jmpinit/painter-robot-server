// construct g-code commands

function position(x, y, z) {
    return `X${x}Y${y}Z${z}`;
}

function absolute() {
    return 'G90';
}

export {
    absolute,
    position,
};
