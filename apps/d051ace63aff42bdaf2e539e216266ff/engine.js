(function(root){'use strict';
const SHAPES={I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1],[0,0,0]],S:[[0,1,1],[1,1,0],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]],J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]]};
const COLORS={I:'#6fcac8',O:'#eac56a',T:'#ad92d1',S:'#8dbd83',Z:'#d98178',J:'#7b9ed0',L:'#dda66f'};
class Game{
 constructor(random=Math.random){this.random=random;this.reset();this.state='ready'}
 reset(){this.board=Array.from({length:20},()=>Array(10).fill(null));this.bag=[];this.queue=[];this.score=0;this.lines=0;this.level=1;this.state='running';this.event='';this.lastClear=0;this.fillQueue();this.spawn()}
 fillQueue(){while(this.queue.length<5){if(!this.bag.length){this.bag=Object.keys(SHAPES);for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]]}}this.queue.push(this.bag.pop())}}
 spawn(){const type=this.queue.shift();this.fillQueue();const matrix=SHAPES[type].map(r=>r.slice());this.piece={type,matrix,x:Math.floor((10-matrix.length)/2),y:0};this.fall=0;this.lockTime=0;this.lockResets=0;if(!this.fits(matrix,this.piece.x,0)){this.state='over';this.event='over'}}
 fits(matrix,x,y){for(let row=0;row<matrix.length;row++)for(let col=0;col<matrix[row].length;col++){if(!matrix[row][col])continue;const px=x+col,py=y+row;if(px<0||px>=10||py>=20)return false;if(py>=0&&this.board[py][px])return false}return true}
 grounded(){return !this.fits(this.piece.matrix,this.piece.x,this.piece.y+1)}
 adjustLock(wasGrounded){if(wasGrounded&&this.lockResets<15){this.lockTime=0;this.lockResets++}}
 move(dx){if(this.state!=='running')return false;const p=this.piece,ground=this.grounded();if(!this.fits(p.matrix,p.x+dx,p.y))return false;p.x+=dx;this.adjustLock(ground);return true}
 rotate(direction=1){if(this.state!=='running')return false;if(this.piece.type==='O')return false;const p=this.piece,n=p.matrix.length,ground=this.grounded();const rotated=Array.from({length:n},()=>Array(n).fill(0));for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(direction>0)rotated[x][n-1-y]=p.matrix[y][x];else rotated[n-1-x][y]=p.matrix[y][x];for(const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,-2]])if(this.fits(rotated,p.x+dx,p.y+dy)){p.matrix=rotated;p.x+=dx;p.y+=dy;this.adjustLock(ground);return true}return false}
 down(manual=false){if(this.state!=='running')return false;const p=this.piece;if(!this.fits(p.matrix,p.x,p.y+1))return false;p.y++;if(manual)this.score++;return true}
 ghostY(){let y=this.piece.y;while(this.fits(this.piece.matrix,this.piece.x,y+1))y++;return y}
 hardDrop(){if(this.state!=='running')return;const y=this.ghostY();this.score+=(y-this.piece.y)*2;this.piece.y=y;this.lock()}
 lock(){if(this.state!=='running')return;const p=this.piece;for(let y=0;y<p.matrix.length;y++)for(let x=0;x<p.matrix[y].length;x++)if(p.matrix[y][x]){if(p.y+y<0){this.state='over';this.event='over';return}this.board[p.y+y][p.x+x]=p.type}const remaining=this.board.filter(row=>row.some(c=>!c));const cleared=20-remaining.length;this.lastClear=cleared;if(cleared){this.score+=[0,100,300,500,800][cleared]*this.level;this.lines+=cleared;this.level=1+Math.floor(this.lines/10);this.board=Array.from({length:cleared},()=>Array(10).fill(null)).concat(remaining);this.event='clear'}this.spawn()}
 pause(){if(this.state==='running')this.state='paused';else if(this.state==='paused')this.state='running'}
 interval(){return Math.max(75,800*Math.pow(.82,this.level-1))}
 tick(dt){if(this.state!=='running'||!Number.isFinite(dt)||dt<=0)return;let left=Math.min(dt,1000);while(left>0&&this.state==='running'){const step=Math.min(16,left);left-=step;this.fall+=step;if(this.fall>=this.interval()){this.fall-=this.interval();this.down(false)}if(this.grounded()){this.lockTime+=step;if(this.lockTime>=450)this.lock()}else this.lockTime=0}}
}
const api={Game,SHAPES,COLORS};if(typeof module==='object'&&module.exports)module.exports=api;else root.BlockGame=api;
})(typeof globalThis!=='undefined'?globalThis:this);
