// construct g-code commands

function position(x, y, z) {
    return `X${x}Y${y}Z${z}`;
}

function interpolate() {
    return 'G01';
}

function absolute() {
    return 'G90';
}

function feedRate(rate) {
    return `F${rate}`;
}

export {
    absolute,
    position,
    interpolate,
    feedRate,
};
