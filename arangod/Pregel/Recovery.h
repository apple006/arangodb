////////////////////////////////////////////////////////////////////////////////
/// DISCLAIMER
///
/// Copyright 2016 ArangoDB GmbH, Cologne, Germany
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
/// Copyright holder is ArangoDB GmbH, Cologne, Germany
///
/// @author Simon Grätzer
////////////////////////////////////////////////////////////////////////////////

#ifndef ARANGODB_PREGEL_RECOVERY_H
#define ARANGODB_PREGEL_RECOVERY_H 1

#include "Basics/Mutex.h"
#include "Cluster/ClusterInfo.h"
#include "Agency/AgencyComm.h"
#include "Agency/AgencyCallbackRegistry.h"
#include <velocypack/velocypack-aliases.h>
#include <velocypack/vpack.h>


namespace arangodb {
namespace pregel {

template<typename V, typename E>
class GraphStore;
class Conductor;
  
class RecoveryManager {
  
  Mutex _lock;
  AgencyComm _agency;
  AgencyCallbackRegistry *_agencyCallbackRegistry;//weak
  
  std::map<ShardID, std::set<Conductor*>> _listeners;
  std::map<ShardID, ServerID> _primaryServer;
  std::map<ShardID, std::shared_ptr<AgencyCallback>> _agencyCallbacks;
  
  void _monitorShard(CollectionID const& cid, ShardID const& shard);
  
 public:
  RecoveryManager(AgencyCallbackRegistry *registry);
  ~RecoveryManager();

  void monitorCollections(std::vector<std::shared_ptr<LogicalCollection>> const& collections, Conductor*);
  void stopMonitoring(Conductor*);
  int filterGoodServers(std::vector<ServerID> const& servers, std::set<ServerID> &goodServers);
  //bool allServersAvailable(std::vector<ServerID> const& dbServers);
};
  
class RecoveryWorker {
  friend class RestPregelHandler;
  
  std::map<ShardID, ServerID> _secondaries;
  ServerID const* secondaryForShard(ShardID const& shard) {return nullptr;}
  
  //receivedBackupData(VPackSlice slice);
  
public:
  template<typename V, typename E>
  void replicateGraphData(GraphStore<V,E> *graphStore) {}
  
  void reloadPlanData() {_secondaries.clear();}
};
}
}
#endif