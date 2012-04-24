/*jslint indent: 2,
         nomen: true,
         maxlen: 80,
         sloppy: true,
         plusplus: true */
/*global require, WeakDictionary, exports */

////////////////////////////////////////////////////////////////////////////////
/// @brief JavaScript actions functions
///
/// @file
///
/// DISCLAIMER
///
/// Copyright 2010-2012 triagens GmbH, Cologne, Germany
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is triAGENS GmbH, Cologne, Germany
///
/// @author Dr. Frank Celler
/// @author Copyright 2011-2012, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var internal = require("internal"),
  db = internal.db,
  edges = internal.edges,
  AvocadoCollection = internal.AvocadoCollection,
  AvocadoEdgesCollection = internal.AvocadoEdgesCollection,
  shallowCopy,
  propertyKeys;

// -----------------------------------------------------------------------------
// --SECTION--                                                   private methods
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/// @brief shallow copy properties
////////////////////////////////////////////////////////////////////////////////

shallowCopy = function (props) {
  var shallow,
    key;

  shallow = {};

  for (key in props) {
    if (props.hasOwnProperty(key) && key[0] !== '_' && key[0] !== '$') {
      shallow[key] = props[key];
    }
  }

  return shallow;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief property keys
////////////////////////////////////////////////////////////////////////////////

propertyKeys = function (props) {
  var keys,
    key;

  keys = [];

  for (key in props) {
    if (props.hasOwnProperty(key) && key[0] !== '_' && key[0] !== '$') {
      keys.push(key);
    }
  }

  return keys;
};

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////


// -----------------------------------------------------------------------------
// --SECTION--                                                              Edge
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// --SECTION--                                      constructors and destructors
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/// @brief constructs a new edge object
////////////////////////////////////////////////////////////////////////////////

function Edge(graph, id) {
  var props;

  this._graph = graph;
  this._id = id;

  props = this._graph._edges.document(this._id);

  if (props) {
    // extract the custom identifier, label, edges
    this._properties = props;
  }
  else {
    // deleted
    throw "accessing a deleted edge";
  }
}

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
// --SECTION--                                                  public functions
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/// @brief returns the identifier of an edge
///
/// @FUN{@FA{edge}.getId()}
///
/// Returns the identifier of the @FA{edge}.
///
/// @EXAMPLES
///
/// @verbinclude graph13
////////////////////////////////////////////////////////////////////////////////

Edge.prototype.getId = function () {
  return this._properties.$id;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief returns the to vertex
///
/// @FUN{@FA{edge}.getInVertex()}
///
/// Returns the vertex at the head of the @FA{edge}.
///
/// @EXAMPLES
///
/// @verbinclude graph21
////////////////////////////////////////////////////////////////////////////////

Edge.prototype.getInVertex = function () {
  return this._graph.constructVertex(this._properties._to);
};

////////////////////////////////////////////////////////////////////////////////
/// @brief label of an edge
///
/// @FUN{@FA{edge}.getLabel()}
///
/// Returns the label of the @FA{edge}.
///
/// @EXAMPLES
///
/// @verbinclude graph20
////////////////////////////////////////////////////////////////////////////////

Edge.prototype.getLabel = function () {
  return this._properties.$label;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief returns the from vertex
///
/// @FUN{@FA{edge}.getOutVertex()}
///
/// Returns the vertex at the tail of the @FA{edge}.
///
/// @EXAMPLES
///
/// @verbinclude graph22
////////////////////////////////////////////////////////////////////////////////

Edge.prototype.getOutVertex = function () {
  return this._graph.constructVertex(this._properties._from);
};

////////////////////////////////////////////////////////////////////////////////
/// @brief returns a property of an edge
///
/// @FUN{@FA{edge}.getProperty(@FA{name})}
///
/// Returns the property @FA{name} an @FA{edge}.
///
/// @EXAMPLES
///
/// @verbinclude graph12
////////////////////////////////////////////////////////////////////////////////

Edge.prototype.getProperty = function (name) {
  return this._properties[name];
};

////////////////////////////////////////////////////////////////////////////////
/// @brief gets all property names of an edge
///
/// @FUN{@FA{edge}.getPropertyKeys()}
///
/// Returns all propety names an @FA{edge}.
///
/// @EXAMPLES
///
/// @verbinclude graph32
////////////////////////////////////////////////////////////////////////////////

Edge.prototype.getPropertyKeys = function () {
  return propertyKeys(this._properties);
};

////////////////////////////////////////////////////////////////////////////////
/// @brief changes a property of an edge
///
/// @FUN{@FA{edge}.setProperty(@FA{name}, @FA{value})}
///
/// Changes or sets the property @FA{name} an @FA{edges} to @FA{value}.
///
/// @EXAMPLES
///
/// @verbinclude graph14
////////////////////////////////////////////////////////////////////////////////

Edge.prototype.setProperty = function (name, value) {
  var shallow = shallowCopy(this._properties),
    id;

  shallow.$id = this._properties.$id;
  shallow.$label = this._properties.$label;
  shallow[name] = value;

  // TODO use "update" if this becomes available
  id = this._graph._edges.replace(this._properties, shallow);
  this._properties = this._graph._edges.document(id);

  return value;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief returns all properties of an edge
///
/// @FUN{@FA{edge}.properties()}
///
/// Returns all properties and their values of an @FA{edge}
///
/// @EXAMPLES
///
/// @verbinclude graph11
////////////////////////////////////////////////////////////////////////////////

Edge.prototype.properties = function () {
  var shallow = shallowCopy(this._properties);

  delete shallow.$id;
  delete shallow.$label;

  delete shallow._id;
  delete shallow._rev;
  delete shallow._from;
  delete shallow._to;

  return shallow;
};

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
// --SECTION--                                                   private methods
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/// @brief edge printing
////////////////////////////////////////////////////////////////////////////////

Edge.prototype._PRINT = function (seen, path, names) {

  // Ignores the standard arguments
  seen = path = names = null;

  if (!this._id) {
    internal.output("[deleted Edge]");
  }
  else if (this._properties.$id !== undefined) {
    if (typeof this._properties.$id === "string") {
      internal.output("Edge(\"", this._properties.$id, "\")");
    }
    else {
      internal.output("Edge(", this._properties.$id, ")");
    }
  }
  else {
    internal.output("Edge(<", this._id, ">)");
  }
};

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
// --SECTION--                                                            VERTEX
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// --SECTION--                                      constructors and destructors
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/// @brief constructs a new vertex object
////////////////////////////////////////////////////////////////////////////////

function Vertex(graph, id) {
  var props;

  this._graph = graph;
  this._id = id;

  props = this._graph._vertices.document(this._id);

  if (props) {
    // extract the custom identifier
    this._properties = props;
  }
  else {
    // deleted
    throw "accessing a deleted edge";
  }
}

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
// --SECTION--                                                  public functions
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/// @brief adds an inbound edge
///
/// @FUN{@FA{vertex}.addInEdge(@FA{id}, @FA{peer})}
///
/// Creates a new edge from @FA{peer} to @FA{vertex} and returns the edge
/// object. The identifier @FA{id} must be a unique identifier or null.
///
/// @FUN{@FA{vertex}.addInEdge(@FA{id}, @FA{peer}, @FA{label})}
///
/// Creates a new edge from @FA{peer} to @FA{vertex} with given label and
/// returns the edge object.
///
/// @FUN{@FA{vertex}.addInEdge(@FA{id}, @FA{peer}, @FA{label}, @FA{data})}
///
/// Creates a new edge from @FA{peer} to @FA{vertex} with given label and
/// properties defined in @FA{data}. Returns the edge object.
///
/// @EXAMPLES
///
/// @verbinclude graph33
///
/// @verbinclude graph23
///
/// @verbinclude graph24
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.addInEdge = function (id, out, label, data) {
  return this._graph.addEdge(id, out, this, label, data);
};

////////////////////////////////////////////////////////////////////////////////
/// @brief adds an outbound edge
///
/// @FUN{@FA{vertex}.addOutEdge(@FA{peer})}
///
/// Creates a new edge from @FA{vertex} to @FA{peer} and returns the edge
/// object.
///
/// @FUN{@FA{vertex}.addOutEdge(@FA{peer}, @FA{label})}
///
/// Creates a new edge from @FA{vertex} to @FA{peer} with given @FA{label} and
/// returns the edge object.
///
/// @FUN{@FA{vertex}.addOutEdge(@FA{peer}, @FA{label}, @FA{data})}
///
/// Creates a new edge from @FA{vertex} to @FA{peer} with given @FA{label} and
/// properties defined in @FA{data}. Returns the edge object.
///
/// @EXAMPLES
///
/// @verbinclude graph34
///
/// @verbinclude graph27
///
/// @verbinclude graph28
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.addOutEdge = function (id, ine, label, data) {
  return this._graph.addEdge(id, this, ine, label, data);
};

////////////////////////////////////////////////////////////////////////////////
/// @brief inbound and outbound edges
///
/// @FUN{@FA{vertex}.edges()}
///
/// Returns a list of in- or outbound edges of the @FA{vertex}.
///
/// @EXAMPLES
///
/// @verbinclude graph15
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.edges = function () {
  var query,
    result,
    graph,
    i;

  graph = this._graph;
  query = graph._edges.edges(this._id);

  result = [];

  for (i = 0;  i < query.length;  ++i) {
    result.push(graph.constructEdge(query[i]._id));
  }

  return result;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief returns the identifier of a vertex
///
/// @FUN{@FA{vertex}.getId()}
///
/// Returns the identifier of the @FA{vertex}. If the vertex was deleted, then
/// @CODE{undefined} is returned.
///
/// @EXAMPLES
///
/// @verbinclude graph8
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.getId = function () {
  return this._properties.$id;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief inbound edges with given label
///
/// @FUN{@FA{vertex}.getInEdges(@FA{label}, ...)}
///
/// Returns a list of inbound edges of the @FA{vertex} with given label(s).
///
/// @EXAMPLES
///
/// @verbinclude graph18
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.getInEdges = function () {
  var labels,
    result,
    i;

  if (arguments.length === 0) {
    result = this.inbound();
  }
  else {
    labels = {};

    for (i = 0;  i < arguments.length;  ++i) {
      labels[arguments[i]] = true;
    }

    edges = this.inbound();
    result = [];

    for (i = 0;  i < edges.length;  ++i) {
      if (labels.hasOwnProperty(edges[i].getLabel())) {
        result.push(edges[i]);
      }
    }
  }

  return result;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief outbound edges with given label
///
/// @FUN{@FA{vertex}.getOutEdges(@FA{label}, ...)}
///
/// Returns a list of outbound edges of the @FA{vertex} with given label(s).
///
/// @EXAMPLES
///
/// @verbinclude graph19
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.getOutEdges = function () {
  var labels,
    result,
    i;

  if (arguments.length === 0) {
    result = this.outbound();
  }
  else {
    labels = {};
    for (i = 0;  i < arguments.length;  ++i) {
      labels[arguments[i]] = true;
    }

    edges = this.outbound();
    result = [];

    for (i = 0;  i < edges.length;  ++i) {
      if (labels.hasOwnProperty(edges[i].getLabel())) {
        result.push(edges[i]);
      }
    }
  }

  return result;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief returns a property of a vertex
///
/// @FUN{@FA{vertex}.getProperty(@FA{name})}
///
/// Returns the property @FA{name} a @FA{vertex}.
///
/// @EXAMPLES
///
/// @verbinclude graph5
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.getProperty = function (name) {
  return this._properties[name];
};

////////////////////////////////////////////////////////////////////////////////
/// @brief gets all property names of a vertex
///
/// @FUN{@FA{vertex}.getPropertyKeys()}
///
/// Returns all propety names a @FA{vertex}.
///
/// @EXAMPLES
///
/// @verbinclude graph7
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.getPropertyKeys = function () {
  return propertyKeys(this._properties);
};

////////////////////////////////////////////////////////////////////////////////
/// @brief inbound edges
///
/// @FUN{@FA{vertex}.inbound()}
///
/// Returns a list of inbound edges of the @FA{vertex}.
///
/// @EXAMPLES
///
/// @verbinclude graph16
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.inbound = function () {
  var query,
    result,
    graph,
    i;

  graph = this._graph;
  query = graph._edges.inEdges(this._id);

  result = [];

  for (i = 0;  i < query.length;  ++i) {
    result.push(graph.constructEdge(query[i]._id));
  }

  return result;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief outbound edges
///
/// @FUN{@FA{vertex}.outbound()}
///
/// Returns a list of outbound edges of the @FA{vertex}.
///
/// @EXAMPLES
///
/// @verbinclude graph17
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.outbound = function () {
  var query,
    result,
    graph,
    i;

  graph = this._graph;
  query = graph._edges.outEdges(this._id);

  result = [];

  for (i = 0;  i < query.length;  ++i) {
    result.push(graph.constructEdge(query[i]._id));
  }

  return result;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief returns all properties of a vertex
///
/// @FUN{@FA{vertex}.properties()}
///
/// Returns all properties and their values of a @FA{vertex}
///
/// @EXAMPLES
///
/// @verbinclude graph4
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.properties = function () {
  var shallow = shallowCopy(this._properties);

  delete shallow.$id;

  delete shallow._id;
  delete shallow._rev;

  return shallow;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief changes a property of a vertex
///
/// @FUN{@FA{vertex}.setProperty(@FA{name}, @FA{value})}
///
/// Changes or sets the property @FA{name} a @FA{vertex} to @FA{value}.
///
/// @EXAMPLES
///
/// @verbinclude graph6
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype.setProperty = function (name, value) {
  var shallow = shallowCopy(this._properties),
    id;

  shallow.$id = this._properties.$id;
  shallow[name] = value;

  // TODO use "update" if this becomes available
  id = this._graph._vertices.replace(this._id, shallow);
  this._properties = this._graph._vertices.document(id);

  return value;
};

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
// --SECTION--                                                   private methods
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/// @brief vertex representation
////////////////////////////////////////////////////////////////////////////////

Vertex.prototype._PRINT = function (seen, path, names) {
  // Ignores the standard arguments
  seen = path = names = null;

  if (!this._id) {
    internal.output("[deleted Vertex]");
  }
  else if (this._properties.$id !== undefined) {
    if (typeof this._properties.$id === "string") {
      internal.output("Vertex(\"", this._properties.$id, "\")");
    }
    else {
      internal.output("Vertex(", this._properties.$id, ")");
    }
  }
  else {
    internal.output("Vertex(<", this._id, ">)");
  }
};

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
// --SECTION--                                                             GRAPH
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// --SECTION--                                      constructors and destructors
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/// @brief constructs a new graph object
///
/// @FUN{Graph(@FA{name}, @FA{vertices}, @FA{edges})}
///
/// Constructs a new graph object using the collection @FA{vertices} for all
/// vertices and the collection @FA{edges} for all edges. Note that it is
/// possible to construct two graphs with the same vertex set, but different
/// edge sets.
///
/// @FUN{Graph(@FA{name})}
///
/// Returns a known graph.
///
/// @EXAMPLES
///
/// @verbinclude graph1
////////////////////////////////////////////////////////////////////////////////

function Graph (name, vertices, edges) {
  var gdb;
  var col;
  var props;

  gdb = internal.db._collection("_graph");

  if (gdb === null) {
    gdb = internal.db._create("_graph", { waitForSync : true, isSystem : true });

    // gdb.ensureUniqueConstraint("name");
  }
  
  // @FUN{Graph(@FA{name})}
  if (vertices === undefined && edges == undefined) {
    props = gdb.firstExample('name', name);
    
    if (props === null) {
      throw "no graph named '" + name + "' found";
    }

    vertices = internal.db._collection(props.vertices);

    if (vertices == null) {
      throw "vertex collection '" + props.vertices + "' has vanished";
    }

    edges = internal.edges._collection(props.edges);

    if (edges == null) {
      throw "edge collection '" + props.edges + "' has vanished";
    }
  }

  // @FUN{Graph(@FA{name}, @FA{vertices}, @FA{edges})}
  else {

    // get the vertices collection
    if (typeof vertices === "string") {
      col = internal.db._collection(vertices);

      if (col === null) {
        col = internal.db._create(vertices);
      }

      if (col == null) {
        throw "vertex collection '" + vertices + "' has vanished";
      }

      // col.ensureUniqueConstraint("$id");

      vertices = col;
    }

    // get the edges collection
    if (typeof edges === "string") {
      col = internal.edges._collection(edges);

      if (col === null) {
        col = internal.edges._create(edges);
      }

      if (col == null) {
        throw "edge collection '" + edges + "' has vanished";
      }

      // col.ensureUniqueConstraint("$id");

      edges = col;
    }

    // find graph by name
    if (typeof name !== "string" || name === "") {
      throw "<name> must be a string";
    }

    props = gdb.firstExample('name', name);

    // name is unknown
    if (props === null) {

      // check if know that graph
      props = gdb.firstExample('vertices', vertices._id, 'edges', edges._id);

      if (props === null) {
        d = gdb.save({ 'vertices' : vertices._id,
                       'verticesName' : vertices.name(),
                       'edges' : edges._id,
                       'edgesName' : edges.name(),
                       'name' : name });

        props = gdb.document(d);
      }
      else {
        throw "found graph but has different <name>";
      }
    }
    else {
      if (props.vertices !== vertices._id) {
        throw "found graph but has different <vertices>";
      }

      if (props.edges !== edges._id) {
        throw "found graph but has different <edges>";
      }
    }
  }

  if (! (vertices instanceof AvocadoCollection)) {
    throw "<vertices> must be a document collection";
  }

  if (! (edges instanceof AvocadoEdgesCollection)) {
    throw "<edges> must be an edges collection";
  }

  this._properties = props;

  // and store the collections
  this._vertices = vertices;
  this._edges = edges;

  // and weak dictionary for vertices and edges
  this._weakVertices = new WeakDictionary();
  this._weakEdges = new WeakDictionary();
}

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
// --SECTION--                                                  public functions
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/// @brief drops the graph, the vertices, and the edges
///
/// @FUN{@FA{graph}.drop()}
///
/// Drops the graph, the vertices, and the edges. Handle with care.
////////////////////////////////////////////////////////////////////////////////

Graph.prototype.drop = function () {
  var gdb;

  gdb = internal.db._collection("_graph");

  gdb.remove(this._properties);

  this._vertices.drop();
  this._edges.drop();
}

////////////////////////////////////////////////////////////////////////////////
/// @brief adds an edge to the graph
///
/// @FUN{@FA{graph}.addEdge(@FA{id}, @FA{out}, @FA{in})}
///
/// Creates a new edge from @FA{out} to @FA{in} and returns the edge object. The
/// identifier @FA{id} must be a unique identifier or null.
///
/// @FUN{@FA{graph}.addEdge(@FA{id}, @FA{out}, @FA{in}, @FA{label})}
///
/// Creates a new edge from @FA{out} to @FA{in} with @FA{label} and returns the
/// edge object.
///
/// @FUN{@FA{graph}.addEdge(@FA{id}, @FA{out}, @FA{in}, @FA{data})}
///
/// Creates a new edge and returns the edge object. The edge contains the
/// properties defined in @FA{data}.
///
/// @FUN{@FA{graph}.addEdge(@FA{id}, @FA{out}, @FA{in}, @FA{label}, @FA{data})}
///
/// Creates a new edge and returns the edge object. The edge has the
/// label @FA{label} and contains the properties defined in @FA{data}.
///
/// @EXAMPLES
///
/// @verbinclude graph30
///
/// @verbinclude graph9
///
/// @verbinclude graph31
///
/// @verbinclude graph10
////////////////////////////////////////////////////////////////////////////////

Graph.prototype.addEdge = function (id, out, ine, label, data) {
  var ref,
    shallow;

  if (typeof label === 'object') {
    data = label;
    label = undefined;
  }

  if (label === undefined) {
    label = null;
  }

  if (data === null || typeof data !== "object") {
    data = {};
  }

  shallow = shallowCopy(data);

  shallow.$id = id || null;
  shallow.$label = label || null;

  ref = this._edges.save(out._id, ine._id, shallow);

  return this.constructEdge(ref._id);
};

////////////////////////////////////////////////////////////////////////////////
/// @brief adds a vertex to the graph
///
/// @FUN{@FA{graph}.addVertex(@FA{id})}
///
/// Creates a new vertex and returns the vertex object. The identifier
/// @FA{id} must be a unique identifier or null.
///
/// @FUN{@FA{graph}.addVertex(@FA{id}, @FA{data})}
///
/// Creates a new vertex and returns the vertex object. The vertex contains
/// the properties defined in @FA{data}.
///
/// @EXAMPLES
///
/// Without any properties:
///
/// @verbinclude graph2
///
/// With given properties:
///
/// @verbinclude graph3
////////////////////////////////////////////////////////////////////////////////

Graph.prototype.addVertex = function (id, data) {
  var ref,
    shallow;

  if (data === null || typeof data !== "object") {
    data = {};
  }

  shallow = shallowCopy(data);

  shallow.$id = id || null;

  ref = this._vertices.save(shallow);

  return this.constructVertex(ref._id);
};

////////////////////////////////////////////////////////////////////////////////
/// @brief returns a vertex given its id
///
/// @FUN{@FA{graph}.getVertex(@FA{id})}
///
/// Returns the vertex identified by @FA{id} or @LIT{null}.
///
/// @EXAMPLES
///
/// @verbinclude graph29
////////////////////////////////////////////////////////////////////////////////

Graph.prototype.getVertex = function (id) {
  var ref,
    vertex;

  ref = this._vertices.firstExample('$id', id);

  if (ref !== null) {
    vertex = this.constructVertex(ref._id);
  }
  else {
    vertex = null;
  }

  return vertex;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief returns an iterator for all vertices
///
/// @FUN{@FA{graph}.getVertices()}
///
/// Returns an iterator for all vertices of the graph. The iterator supports the
/// methods @FN{hasNext} and @FN{next}.
///
/// @EXAMPLES
///
/// @verbinclude graph35
////////////////////////////////////////////////////////////////////////////////

Graph.prototype.getVertices = function () {
  var that,
    all,
    v,
    Iterator;

  that = this;
  all = this._vertices.all();

  Iterator = function () {
    this.next = function next() {
      v = all.next();

      if (v === undefined) {
        return undefined;
      }

      return that.constructVertex(v._id);
    };

    this.hasNext = function hasNext() {
      return all.hasNext();
    };

    this._PRINT = function (seen, path, names) {
      // Ignores the standard arguments
      seen = path = names = null;

      internal.output("[vertex iterator]");
    };
  };

  return new Iterator();
};

////////////////////////////////////////////////////////////////////////////////
/// @brief returns an iterator for all edges
///
/// @FUN{@FA{graph}.getEdges()}
///
/// Returns an iterator for all edges of the graph. The iterator supports the
/// methods @FN{hasNext} and @FN{next}.
///
/// @EXAMPLES
///
/// @verbinclude graph36
////////////////////////////////////////////////////////////////////////////////

Graph.prototype.getEdges = function () {
  var that,
    all,
    v,
    Iterator;

  that = this;
  all = this._edges.all();

  Iterator = function () {
    this.next = function next() {
      v = all.next();

      if (v === undefined) {
        return undefined;
      }

      return that.constructEdge(v._id);
    };

    this.hasNext = function hasNext() {
      return all.hasNext();
    };

    this._PRINT = function (seen, path, names) {
      // Ignores the standard arguments
      seen = path = names = null;

      internal.output("[edge iterator]");
    };
  };

  return new Iterator();
};

////////////////////////////////////////////////////////////////////////////////
/// @brief removes a vertex and all in- or out-bound edges
///
/// @FUN{@FA{graph}.removeVertex(@FA{vertex})}
///
/// Deletes the @FA{vertex} and all its edges.
///
/// @EXAMPLES
///
/// @verbinclude graph37
////////////////////////////////////////////////////////////////////////////////

Graph.prototype.removeVertex = function (vertex) {
  var result,
    i;

  if (!vertex._id) {
    return;
  }

  edges = vertex.edges();
  result = this._vertices.remove(vertex._properties);

  if (!result) {
    throw "cannot delete vertex";
  }

  vertex._id = undefined;

  for (i = 0;  i < edges.length;  ++i) {
    this.removeEdge(edges[i]);
  }
};

////////////////////////////////////////////////////////////////////////////////
/// @brief removes an edge
///
/// @FUN{@FA{graph}.removeEdge(@FA{vertex})}
///
/// Deletes the @FA{edge}. Note that the in and out vertices are left untouched.
///
/// @EXAMPLES
///
/// @verbinclude graph38
////////////////////////////////////////////////////////////////////////////////

Graph.prototype.removeEdge = function (edge) {
  var result;

  if (!edge._id) {
    return;
  }

  result = this._edges.remove(edge._properties);

  if (!result) {
    throw "cannot delete edge";
  }

  edge._id = undefined;
};

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
// --SECTION--                                                 private functions
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/// @brief private function to construct a vertex
////////////////////////////////////////////////////////////////////////////////

Graph.prototype.constructVertex = function (id) {
  var vertex = this._weakVertices[id];

  if (vertex === undefined) {
    this._weakVertices[id] = vertex = new Vertex(this, id);
  }

  return vertex;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief private function to construct an edge
////////////////////////////////////////////////////////////////////////////////

Graph.prototype.constructEdge = function (id) {
  var edge = this._weakEdges[id];

  if (edge === null) {
    this._weakEdges[id] = edge = new Edge(this, id);
  }

  return edge;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief graph printing
////////////////////////////////////////////////////////////////////////////////

Graph.prototype._PRINT = function (seen, path, names) {
  var output;

  // Ignores the standard arguments
  seen = path = names = null;

  output = "Graph(\"";
  output += this._properties.name;
  output += "\")";
  internal.output(output);
};

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
// --SECTION--                                                    MODULE EXPORTS
// -----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
/// @addtogroup AvocadoGraph
/// @{
////////////////////////////////////////////////////////////////////////////////

exports.AvocadoCollection = AvocadoCollection;
exports.AvocadoEdgesCollection = AvocadoEdgesCollection;
exports.Edge = Edge;
exports.Graph = Graph;
exports.Vertex = Vertex;

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// Local Variables:
// mode: outline-minor
// outline-regexp: "^\\(/// @brief\\|/// @addtogroup\\|// --SECTION--\\|/// @page\\|/// @}\\)"
// End:
