// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import compile from '../../scripts/compile.js'

export default async function handler(req, res) {
  // console.log('compile', req.url);
  
  try {
    let u = req.url.slice(1);
    if (u) {
      u = u.replace(/^([a-zA-Z0-9]+:\/(?!\/))/, '$1/');
      const resultUint8Array = await compile(u);
      const resultBuffer = Buffer.from(resultUint8Array);
      res.end(resultBuffer);
    } else {
      res.status(404).send('not found');
    }
  } catch(err) {
    console.warn(err);
    res.status(500).send(err.stack);
  }
  
  // res.status(200).json({
  //   url: req.url,
  // });
};
