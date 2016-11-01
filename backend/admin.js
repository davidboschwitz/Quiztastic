var data = {};

module.exports = function(req,res){
      var name = req.params.name;
      var rtn = {}; //init an object to return
      //rtn.quiz = JSON.parse(fs.readFileSync('sample_questions.json'));
      rtn.name = name;
      req.session['name'] = name;
      //return the object in json format.
      res.json(req.session);

};
