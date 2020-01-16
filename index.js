const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const swaggerJSDoc = require('swagger-jsdoc');

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// for swagger ui
app.use(express.static('swagger'));
const options = {
  swaggerDefinition: {
      info: {
          title: 'Sevens API',
          version: '1.0.0',
          descripion: '７並べ用API仕様書'
      },
      consumes: ['application/json'],
      produces: ['application/json']
  },
  apis: ['./index.js'],
};
const swaggerSpec = swaggerJSDoc(options);
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});


/**
 * @swagger
 * definitions:
 *    ICard:
 *      type: object
 *      descripion: カード情報
 *      properties:
 *        number:
 *          type: number
 *          example: 1
 *          description: カード番号(1～13)
 *        kind:
 *          example: 'D'
 *          schema:
 *            type: string
 *            enum: [D,S,C,H]
 *          description: |
 *            カード種類
 *            * `D` - ダイヤ
 *            * `S` - スペード
 *            * `C` - クローバ－
 *            * `H` - ハート
 *    IPlayer:
 *      type: object
 *      description: プレーヤー情報
 *      properties:
 *        cards: 
 *          type: array
 *          descripion: プレーヤーの保持しているカード情報
 *          items:
 *            $ref: '#/definitions/ICard'
 *        pass:
 *          type: number
 *          descripion: パス可能な回数
 *    ProgressRequest:
 *      type: object
 *      description: ゲーム情報
 *      properties:
 *        cardsInPlay:
 *          type: array
 *          descripion: 場にあるカード情報
 *          items:
 *            $ref: '#/definitions/ICard'
 *        me:
 *          type: object
 *          example: {pass: 3, cards: [{type: 'D', number: 1}]}
 *          description: プレーヤー情報
 *          $ref: '#/definitions/IPlayer'
 *        history:
 *          type: array
 *          descripion: ゲーム履歴
 *          items:
 *            $ref: '#/definitions/IPlayHistory'
 *        players:
 *          type: array
 *          descripion: 参加者情報
 *          items:
 *            $ref: '#/definitions/IPlayerInfo'
 *    IPlayerInfo:
 *      type: object
 *      descripion: プレーヤー情報
 *      properties:
 *        id:
 *          type: number
 *          descripion: プレーヤーId
 *        pass:
 *          type: number
 *          descripion: 残りパス回数
 *        cards:
 *          type: number
 *          descripion: カード枚数
 *        isGameOver:
 *          type: boolean
 *          descripion: ゲームオーバーかどうか
 *        isGameClear:
 *          type: boolean
 *          descripion: ゲームクリアかどうか
 *    IPlayHistory:
 *      type: object
 *      descripion: ゲーム履歴
 *      properties:
 *        playerId: 
 *          type: number
 *          required: true
 *          descripion: プレーヤーId
 *        card:
 *          type: object
 *          descripion: カード情報
 *          $ref: '#/definitions/ICard'
 *        pass:
 *          type: boolean
 *          descripion: パスしたかどうか
 *          required: true
 *    ProgressResponse:
 *      descripion: ゲーム進行情報
 *      properties:
 *        pass:
 *          type: boolean
 *          required: true
 *          descripion: パスする場合はtrueをセット
 *          example: true
 *        number: 
 *          type: number
 *          required: false
 *          example: 1
 *          descripion: カード番号(1～13)
 *        kind:
 *          example: 'D'
 *          required: false
 *          schema:
 *            type: string
 *            enum: [D,S,C,H]
 *          description: |
 *            カード種類
 *            * `D` - ダイヤ
 *            * `S` - スペード
 *            * `C` - クローバ－
 *            * `H` - ハート
 *          
 */


/**
 * @swagger
 * /health:
 *    get:
 *      summary: ヘルスチェック実行
 *      description: |
 *        ヘルスチェックを実行する
 *        このAPIの呼び出しに失敗した場合は、続行不能とみなし失格となる。
 *      responses:
 *        200:
 *          description: ヘルスチェック成功
 */
app.get('/health', (req, res) => {
  res.sendStatus(200);
});

/**
 * @swagger
 * /progress:
 *    post:
 *      summary: ゲームを進行する
 *      description: |
 *        ゲームを進行する
 *        場のカード情報とパス回数を考慮して、場に出すカードを返却する
 *        パスしたい場合は、回数内に限りパスを可能とする
 *      parameters:
 *        - in: body
 *          name: 
 *          description: ゲーム情報
 *          required: true
 *          schema:
 *            $ref: '#/definitions/ProgressRequest'
 *      responses:
 *        200:
 *          description: 場に出すカード情報、またはパスの指示
 *          schema:
 *            type: object
 *            example: {pass: false, kind: 'D', number: 1}
 *            $ref: '#/definitions/ProgressResponse'
 */
app.post('/progress', (req, res) => {
  console.log(req.body);

  // 出せるカード
  const availableCards = _(req.body.cardsInPlay)
    .filter(w => w.number !== 1 && w.number !== 13)
    .groupBy(g => g.kind)
    .map((s, k) => {
      return {
        kind: k,
        low: _(s).minBy(o => o.number).number - 1,  
        high: _(s).maxBy(o => o.number).number + 1
      }
    })
    .value();
  console.log(availableCards);

  // 手持ちのカード
  const canPlay = _(req.body.me.cards)
    .filter(w => 0 <= _(availableCards)
      .findIndex(i => i.kind === w.kind && (i.low === w.number || i.high === w.number)))
    .value();
  
  if(0 < canPlay.length) {
    const playCard = canPlay[0];
    console.log('play ==> ', playCard);
    res.send(playCard);
  } else {
    // 出せない場合はpassするしかない
    res.send({pass: true});
  }
});


app.listen(8080, () => {
  console.log('Running on http://localhost:8080/');
});
