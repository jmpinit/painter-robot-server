// @flow

import * as THREE from 'three';
import * as robot from './robot';

const CAM_DISTANCE = 50;

const redMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });

class Motor {
    angle: number;

    constructor(angle = 0) {
        this.angle = angle;
    }

    rotateTo(angle) {
        // TODO set target
        this.angle = angle;
    }
}

class Painter {
    geometry: Object;
    object: Object;
    axes: Object;
    size: number;
    motorCoefficient: number;

    controlling: boolean;
    drawing: boolean;

    canvas: Object;
    texture: Object;

    socket: Object;

    constructor() {
        this.size = 50;
        this.motorCoefficient = 1 / 600;

        this.controlling = false;

        this.axes = {
            x: new Motor(600),
            y: new Motor(),
        };

        this.object = new THREE.Object3D();

        this.geometry = {};

        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024;
        this.canvas.height = 1024;

        // make white background
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.texture = new THREE.Texture(this.canvas);
        this.texture.needsUpdate = true;

        const canvasMaterial = new THREE.MeshBasicMaterial({ map: this.texture });

        this.geometry.canvasBox = new THREE.Mesh(new THREE.BoxGeometry(this.size, this.size, 1), canvasMaterial);
        this.geometry.canvasBox.position.x = this.size / 2;
        this.geometry.canvasBox.position.y = this.size / 2;
        this.geometry.canvasBox.position.z = -1;

        this.geometry.horizontalBox = new THREE.Mesh(new THREE.BoxGeometry(this.size, 2, 1), redMaterial);
        this.geometry.horizontalBox.position.x = this.size / 2;
        this.geometry.horizontalBox.position.y = -1;

        this.geometry.verticalBox = new THREE.Mesh(new THREE.BoxGeometry(this.size, 2, 1), blueMaterial);
        this.geometry.verticalBox.rotation.z = Math.PI / 2;
        this.geometry.verticalBox.position.y = this.size / 2;

        this.geometry.paintBox = (() => {
            const container = new THREE.Object3D();

            const box = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 1), greenMaterial);
            box.position.x -= 3;
            box.position.y += 2;

            const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
            cyl.rotation.x = Math.PI / 2;
            cyl.position.x = -3;
            cyl.position.y = 2;

            container.add(box);
            container.add(cyl);

            return container;
        })();

        this.object.add(this.geometry.canvasBox);
        this.object.add(this.geometry.horizontalBox);
        this.object.add(this.geometry.verticalBox);
        this.object.add(this.geometry.paintBox);

        this.socket = robot.connect();
    }

    tick() {
        if (this.drawing) {
            const x = this.canvas.width * (1 - ((this.axes.x.angle * this.motorCoefficient) + (3 / this.size)));
            const y = this.canvas.height * (1 - ((this.axes.y.angle * this.motorCoefficient) + (2 / this.size)));

            const ctx = this.canvas.getContext('2d');
            ctx.fillStyle = '#f00';
            ctx.fillRect(x, y, 8, 8);
            this.texture.needsUpdate = true;
        }
    }

    updateGeometry() {
        this.geometry.verticalBox.position.x = this.size * (1 - (this.axes.x.angle * this.motorCoefficient));

        this.geometry.paintBox.position.x = this.size * (1 - (this.axes.x.angle * this.motorCoefficient));
        this.geometry.paintBox.position.y = this.size * this.axes.y.angle * this.motorCoefficient;
    }

    moveTo(x, y) {
        if (this.controlling) {
            if (x >= 0 && x < 600 && y >= 0 && x < 600) {
                console.log('moving to', x, y);
                robot.moveTo(this.socket, x, y);

                this.axes.x.rotateTo(x);
                this.axes.y.rotateTo(y);
                this.updateGeometry();
            }
        }
    }
}

(function() {
    const painter = new Painter();
    painter.object.position.x -= painter.size / 2;
    painter.object.position.y -= painter.size / 2;

    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x666666, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    scene.add(painter.object);

    let camAngle = 0;

    function render() {
        requestAnimationFrame(render);

        painter.tick();

        camera.position.x = CAM_DISTANCE * Math.cos(camAngle);
        camera.position.z = CAM_DISTANCE * Math.sin(camAngle);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        camAngle += (1 + Math.sin(Math.PI + camAngle)) / 40 + 0.001;

        renderer.render(scene, camera);
    }

    render();

    document.onmousemove = function(event) {
        var dot, eventDoc, doc, body, pageX, pageY;

        const x = event.pageX;
        const y = event.pageY;

        if (x >= 0 && x < 600 && y >= 0 && y < 600) {
            painter.moveTo(600 - x, 600 - y);
        }
    };

    document.onmousedown = event => { painter.drawing = true; };
    document.onmouseup = event => { painter.drawing = false; };

    document.addEventListener('keydown', event => {
        if (event.keyCode === 13) {
            painter.controlling = true;
        } else if (event.keyCode === 32) {
            painter.controlling = false;
        }
    }, false);
})();
