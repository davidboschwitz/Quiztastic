// Constructor
function User(name, pairCode, userID) {
  this.name = name;
  this.pairCode = pairCode;
  this.userID = userID;
  this.score = 0;
}
// class methods
User.prototype.toString = function() {
  return name;
};
// export the class
module.exports = User;
